<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js'
import cronogramas from '../../data/cronogramas.json'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

const props = defineProps({ circuito: { type: String, default: '' } })
const norm = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const data = computed(() => {
  const q = norm(props.circuito)
  return cronogramas.circuitos.find(c => norm(c.circuito) === q) ?? null
})
const hasData = computed(() => data.value?.valor_ganado?.length > 0)
const BAC     = computed(() => data.value?.bac_evm ?? data.value?.valor_contrato ?? 0)

// ── Métricas por fila ─────────────────────────────────────────────────────────
const rows = computed(() => {
  if (!hasData.value) return []
  const vg  = data.value.valor_ganado
  const cs  = data.value.curva_s ?? []
  return vg.map((r, i) => {
    const pv = r.pv_acum
    const ev = r.ev_acum
    const ac = r.ac_acum
    const sv   = ev != null && pv != null ? ev - pv  : null
    const cv   = ev != null && ac != null ? ev - ac  : null
    const spi  = ev != null && pv && pv > 0 ? ev / pv  : null
    const cpi  = ev != null && ac && ac > 0 ? ev / ac  : null
    const eac  = cpi && cpi > 0 ? BAC.value / cpi : null
    const etc  = eac != null && ac != null ? eac - ac  : null
    const vac  = eac != null ? BAC.value - eac : null
    const _pctRaw = cs[i]?.fis_acum_real
    const pctFis  = (_pctRaw !== null && _pctRaw !== undefined && _pctRaw !== '') ? parseFloat(_pctRaw) : null

    let estado = null, estadoClass = ''
    if (ev != null && pv != null) {
      if (ev === 0 && pv > 0)           { estado = '⚠ ATRASADO';   estadoClass = 'est--bad' }
      else if (spi >= 1)                { estado = '▲ ADELANTADO'; estadoClass = 'est--ok'  }
      else if (spi >= 0.85)             { estado = '⚠ ATRASADO';   estadoClass = 'est--warn' }
      else                              { estado = '⚠ ATRASADO';   estadoClass = 'est--bad'  }
    }
    return { ...r, sv, cv, spi, cpi, eac, etc, vac, pctFis, estado, estadoClass }
  })
})

// ── Resumen final ─────────────────────────────────────────────────────────────
const resumen = computed(() => {
  const withReal = rows.value.filter(r => r.ev_acum != null)
  if (!withReal.length) return null
  const last = withReal[withReal.length - 1]
  return last
})

// ── Formato ───────────────────────────────────────────────────────────────────
const fmtCOP  = v => { const n = parseFloat(v); return isNaN(n) ? '—' : new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n) }
const fmtIdx  = v => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(2) }
const fmtPct  = v => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(1) + '%' }
const fmtSV   = v => v == null ? '—' : (v >= 0 ? '' : '') + fmtCOP(v)
const clsIdx  = v => v == null ? '' : v >= 1 ? 'idx--ok' : v >= 0.85 ? 'idx--warn' : 'idx--bad'
const clsVar  = v => v == null ? '' : v >= 0 ? 'var--ok' : 'var--bad'

// ── Sub-tab ───────────────────────────────────────────────────────────────────
const subTab = ref('tabla')

// ── Chart ─────────────────────────────────────────────────────────────────────
const canvasEl = ref(null)
let chart = null

function buildChart() {
  if (!canvasEl.value || !hasData.value) return
  const r = rows.value
  chart = new Chart(canvasEl.value, {
    type: 'line',
    data: {
      labels: r.map(x => x.periodo),
      datasets: [
        { label:'PV — Valor Planificado', data: r.map(x => x.pv_acum),
          borderColor:'#0b5640', backgroundColor:'rgba(11,86,64,.07)', borderWidth:2.5,
          pointRadius:3, pointHoverRadius:5, pointBackgroundColor:'#0b5640', fill:true, tension:0.4 },
        { label:'EV — Valor Ganado', data: r.map(x => x.ev_acum),
          borderColor:'#3fad72', borderWidth:2.5, borderDash:[6,3],
          pointRadius:4, pointHoverRadius:6, pointBackgroundColor:'#3fad72', fill:false, tension:0.3, spanGaps:false },
        { label:'AC — Costo Real', data: r.map(x => x.ac_acum),
          borderColor:'#b91c1c', borderWidth:2.5, borderDash:[4,4],
          pointRadius:4, pointHoverRadius:6, pointBackgroundColor:'#b91c1c', fill:false, tension:0.3, spanGaps:false },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false, animation:{duration:900,easing:'easeOutQuart'},
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{ position:'bottom', labels:{ font:{family:'Prompt,sans-serif',size:11,weight:'600'}, color:'#6b7280', padding:14, usePointStyle:true, pointStyleWidth:18 } },
        tooltip:{ backgroundColor:'rgba(15,30,22,.92)', titleFont:{family:'Prompt,sans-serif',size:12,weight:'700'}, bodyFont:{family:'Prompt,sans-serif',size:11}, padding:10, cornerRadius:8, borderColor:'rgba(11,86,64,.4)', borderWidth:1,
          callbacks:{ label: i => { const n = parseFloat(i.raw); return !isNaN(n) ? ` ${i.dataset.label}: ${fmtCOP(n)}` : null } } }
      },
      scales:{
        x:{ grid:{color:'rgba(0,0,0,.05)',drawTicks:false}, border:{color:'#e5e7eb'}, ticks:{font:{family:'Prompt,sans-serif',size:10},color:'#9ca3af',maxRotation:45,padding:6} },
        y:{ grid:{color:'rgba(0,0,0,.05)',drawTicks:false}, border:{dash:[4,3],color:'transparent'},
          ticks:{ font:{family:'Prompt,sans-serif',size:10},color:'#9ca3af',padding:8,
            callback: v => v>=1e9 ? '$'+(v/1e9).toFixed(1)+'B' : v>=1e6 ? '$'+(v/1e6).toFixed(0)+'M' : '$'+v } }
      }
    }
  })
}
function destroyChart() { if(chart){ chart.destroy(); chart=null } }
onMounted(async () => { await nextTick(); buildChart() })
onUnmounted(destroyChart)
watch(() => props.circuito, async () => { destroyChart(); await nextTick(); buildChart() })
watch(subTab, async (v) => { if (v === 'grafica') { await nextTick(); destroyChart(); buildChart() } })
</script>

<template>
  <div v-if="!hasData" class="vg-empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
    <p>Sin datos de Valor Ganado para este circuito</p>
  </div>

  <div v-else class="vg-root">

    <!-- Topbar: pills + subtabs -->
    <div class="vg-topbar">
      <div class="vg-meta-pills">
        <span class="vg-pill">BAC: {{ fmtCOP(BAC) }}</span>
        <span class="vg-pill">{{ data.subregion }}</span>
        <span class="vg-pill">Inicio: {{ data.fecha_inicio }}</span>
        <span class="vg-pill">Plazo: {{ data.plazo_meses }} meses</span>
      </div>
      <div class="vg-subtabs">
        <button :class="['vg-stab', subTab==='tabla' && 'vg-stab--active']" @click="subTab='tabla'">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="1" y="1" width="14" height="14" rx="2"/><line x1="1" y1="5" x2="15" y2="5"/><line x1="6" y1="5" x2="6" y2="15"/></svg>
          Tabla
        </button>
        <button :class="['vg-stab', subTab==='grafica' && 'vg-stab--active']" @click="subTab='grafica'">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="2,12 6,7 10,10 14,3"/></svg>
          Gráfica
        </button>
      </div>
    </div>

    <!-- Tabla EVM -->
    <div v-show="subTab==='tabla'" class="vg-table-wrap">
      <table class="vg-tbl">
        <thead>
          <tr>
            <th colspan="2" class="th-g th-g--per">PERÍODO</th>
            <th colspan="1" class="th-g th-g--base">BASE</th>
            <th colspan="2" class="th-g th-g--real">REAL</th>
            <th colspan="2" class="th-g th-g--var">VARIACIONES</th>
            <th colspan="2" class="th-g th-g--idx">ÍNDICES</th>
            <th colspan="3" class="th-g th-g--proy">PROYECCIONES</th>
            <th colspan="1" class="th-g th-g--av">% AVANCE</th>
            <th colspan="1" class="th-g th-g--est">ESTADO</th>
          </tr>
          <tr>
            <th class="th-s">MES N°</th>
            <th class="th-s">PERÍODO</th>
            <th class="th-s th-s--base">PV<br>Acum.($)</th>
            <th class="th-s th-s--real">EV<br>Acum.($)</th>
            <th class="th-s th-s--real">AC<br>Acum.($)</th>
            <th class="th-s th-s--var">SV<br>EV–PV</th>
            <th class="th-s th-s--var">CV<br>EV–AC</th>
            <th class="th-s th-s--idx">SPI<br>EV/PV</th>
            <th class="th-s th-s--idx">CPI<br>EV/AC</th>
            <th class="th-s th-s--proy">EAC<br>BAC/CPI</th>
            <th class="th-s th-s--proy">ETC<br>EAC–AC</th>
            <th class="th-s th-s--proy">VAC<br>BAC–EAC</th>
            <th class="th-s th-s--av">% COMP.</th>
            <th class="th-s th-s--est">ESTADO</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r,i) in rows" :key="r.mes" :class="['tr-row', i%2===0?'tr-even':'tr-odd', r.ev_acum!=null?'tr-has-real':'']">
            <td class="td-n">{{ r.mes }}</td>
            <td class="td-per">{{ r.periodo }}</td>
            <td class="td-base">{{ fmtCOP(r.pv_acum) }}</td>
            <td class="td-real">{{ r.ev_acum != null ? fmtCOP(r.ev_acum) : '' }}</td>
            <td class="td-real">{{ r.ac_acum != null ? fmtCOP(r.ac_acum) : '' }}</td>
            <td class="td-var" :class="clsVar(r.sv)">{{ fmtSV(r.sv) }}</td>
            <td class="td-var" :class="clsVar(r.cv)">{{ fmtSV(r.cv) }}</td>
            <td class="td-idx" :class="clsIdx(r.spi)">{{ fmtIdx(r.spi) }}</td>
            <td class="td-idx" :class="clsIdx(r.cpi)">{{ fmtIdx(r.cpi) }}</td>
            <td class="td-proy">{{ r.eac != null ? fmtCOP(r.eac) : '' }}</td>
            <td class="td-proy">{{ r.etc != null ? fmtCOP(r.etc) : '' }}</td>
            <td class="td-proy">{{ r.vac != null ? fmtCOP(r.vac) : '' }}</td>
            <td class="td-av">{{ fmtPct(r.pctFis) }}</td>
            <td class="td-est"><span v-if="r.estado" class="est-badge" :class="r.estadoClass">{{ r.estado }}</span></td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="tr-resumen">
            <td colspan="2" class="td-res-label">RESUMEN FINAL</td>
            <td class="td-base">{{ fmtCOP(rows[rows.length-1]?.pv_acum) }}</td>
            <td class="td-real">{{ fmtCOP(resumen?.ev_acum) }}</td>
            <td class="td-real">{{ fmtCOP(resumen?.ac_acum) }}</td>
            <td class="td-var" :class="clsVar(resumen?.sv)">{{ fmtSV(resumen?.sv) }}</td>
            <td class="td-var" :class="clsVar(resumen?.cv)">{{ fmtSV(resumen?.cv) }}</td>
            <td class="td-idx" :class="clsIdx(resumen?.spi)">{{ fmtIdx(resumen?.spi) }}</td>
            <td class="td-idx" :class="clsIdx(resumen?.cpi)">{{ fmtIdx(resumen?.cpi) }}</td>
            <td class="td-proy">{{ fmtCOP(resumen?.eac) }}</td>
            <td class="td-proy">{{ fmtCOP(resumen?.etc) }}</td>
            <td class="td-proy">{{ fmtCOP(resumen?.vac) }}</td>
            <td class="td-av">{{ fmtPct(resumen?.pctFis) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Chart -->
    <div v-show="subTab==='grafica'" class="vg-chart-wrap"><canvas ref="canvasEl" /></div>

  </div>
</template>

<style scoped>
.vg-empty { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#c4c9d2;padding:32px }
.vg-empty svg { width:36px;height:36px }
.vg-empty p { margin:0;font-family:'Prompt',sans-serif;font-size:12.5px;text-align:center }

.vg-root { display:flex;flex-direction:column;gap:8px;flex:1;min-height:0 }

.vg-topbar { display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:8px }
.vg-meta-pills { display:flex;gap:6px;flex-wrap:wrap }
.vg-pill {
  display:inline-flex;align-items:center;
  font-family:'Prompt',sans-serif;font-size:10px;font-weight:700;
  padding:3px 10px;border-radius:99px;background:#f0f4f2;color:#4b5563;letter-spacing:.03em
}
.vg-subtabs { display:flex;gap:4px;flex-shrink:0 }
.vg-stab {
  display:inline-flex;align-items:center;gap:5px;
  font-family:'Prompt',sans-serif;font-size:10px;font-weight:700;
  padding:4px 12px;border-radius:6px;border:1px solid #e5e7eb;
  background:#f9fafb;color:#6b7280;cursor:pointer;transition:all .15s;outline:none
}
.vg-stab svg { width:13px;height:13px }
.vg-stab:hover { background:#f0fdf4;color:#0b5640;border-color:#bbf7d0 }
.vg-stab--active { background:#0b5640;color:#fff;border-color:#0b5640 }

.vg-table-wrap { overflow:auto;border:1px solid #e5e7eb;border-radius:8px;scrollbar-width:thin;scrollbar-color:#e5e7eb transparent;flex:1;min-height:0 }
.vg-tbl { width:100%;border-collapse:collapse;font-family:'Prompt',sans-serif;white-space:nowrap }

/* Cabecera de grupos — un solo tono verde oscuro con separadores blancos */
.th-g { font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;text-align:center;padding:6px 8px;background:#0b5640;color:#fff;border-right:2px solid rgba(255,255,255,.2) }

/* Sub-cabeceras — gris claro uniforme; acento sutil sólo en BASE y REAL */
.th-s { font-size:8.5px;font-weight:700;text-align:center;padding:5px 7px;border-bottom:2px solid #e5e7eb;border-right:1px solid #e9ecef;color:#6b7280;background:#f9fafb }
.th-s--base { background:#f0fdf4;color:#065f46 }
.th-s--real { background:#fef9ec;color:#78350f }

/* Filas */
.tr-even { background:#fff }
.tr-odd  { background:#f9fafb }
.tr-has-real { }
.vg-tbl td { padding:5px 8px;font-size:10.5px;color:#374151;border-bottom:1px solid #f3f4f6;text-align:center;border-right:1px solid #f3f4f6 }
.td-n   { color:#9ca3af;font-size:10px;width:32px }
.td-per { font-weight:700;color:#0b5640;text-align:left;padding-left:10px }
.td-base { font-size:10px }
.td-real { font-weight:700;font-size:10px }
.td-var  { font-size:10px }
.td-idx  { font-weight:800;font-size:11px }
.td-proy { font-size:10px;color:#6b7280 }
.td-av   { font-weight:700;color:#0b5640;font-size:10.5px }
.td-est  { min-width:90px }

.var--ok  { color:#0b5640 }
.var--bad { color:#b91c1c }
.idx--ok  { color:#0b5640 }
.idx--warn { color:#d97706 }
.idx--bad { color:#b91c1c }

.est-badge { display:inline-block;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:700;letter-spacing:.03em;white-space:nowrap }
.est--ok   { background:#dcf5e8;color:#0b5640 }
.est--warn { background:#fef3c7;color:#92400e }
.est--bad  { background:#fee2e2;color:#991b1b }

/* Pie de tabla */
.tr-resumen td { background:#f0f4f2;color:#374151;font-weight:800;font-size:10.5px;padding:6px 8px;border-top:2px solid #0b5640;border-bottom:none }
.td-res-label { text-align:left;letter-spacing:.04em;color:#0b5640 }

.vg-chart-wrap { flex:1;min-height:0;position:relative }
</style>
