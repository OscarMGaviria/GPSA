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
const hasData = computed(() => data.value?.curva_s?.length > 0)

const fmtPct  = v => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(2) + '%' }
const fmtCOP  = v => v != null
  ? new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits:0 }).format(v)
  : '—'

// totales fila final
const totals = computed(() => {
  if (!hasData.value) return null
  const rows = data.value.curva_s
  return {
    inv_prog_mes:  rows.reduce((s,r) => s + (r.inv_prog_mes ?? 0), 0),
    inv_acum_prog: rows[rows.length-1]?.inv_acum_prog ?? 0,
    fis_prog_mes:  rows.reduce((s,r) => s + (r.fis_prog_mes ?? 0), 0),
    fis_acum_prog: rows[rows.length-1]?.fis_acum_prog ?? 0,
    inv_acum_real: rows[rows.length-1]?.inv_acum_real ?? null,
    fis_acum_real: rows[rows.length-1]?.fis_acum_real ?? null,
    valor_acum_prog: rows[rows.length-1]?.valor_acum_prog ?? null,
  }
})

// ── Today index ───────────────────────────────────────────────────────────────
const todayIndex = computed(() => {
  if (!data.value?.curva_s) return null
  const MESES = { Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11 }
  const hoy   = new Date()
  for (let i = 0; i < data.value.curva_s.length; i++) {
    const [mon, yr] = data.value.curva_s[i].periodo.split('-')
    if (new Date(+yr, MESES[mon] ?? 0, 15) >= hoy) return i
  }
  return data.value.curva_s.length - 1
})

// ── Chart ─────────────────────────────────────────────────────────────────────
const subTab = ref('grafica')

const canvasEl = ref(null)
let chart = null

const todayLinePlugin = {
  id: 'todayLine',
  afterDraw(ch) {
    const idx = todayIndex.value
    if (idx == null) return
    const { ctx, chartArea: { top, bottom }, scales: { x } } = ch
    const xPos = x.getPixelForValue(idx)
    ctx.save()
    ctx.setLineDash([5,4]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(245,158,11,.8)'
    ctx.beginPath(); ctx.moveTo(xPos, top); ctx.lineTo(xPos, bottom); ctx.stroke()
    ctx.setLineDash([])
    const lbl = 'Hoy', tw = ctx.measureText(lbl).width + 10, bh = 16
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath(); ctx.roundRect(xPos - tw/2, top - 2, tw, bh, 3); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = '600 10px Prompt,sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(lbl, xPos, top + bh - 6)
    ctx.restore()
  }
}

function buildChart() {
  if (!canvasEl.value || !hasData.value) return
  const rows = data.value.curva_s
  chart = new Chart(canvasEl.value, {
    type: 'line',
    plugins: [todayLinePlugin],
    data: {
      labels: rows.map(r => r.periodo),
      datasets: [
        { label:'% Inv. Acum. Programado', data: rows.map(r => r.inv_acum_prog),
          borderColor:'#0b5640', backgroundColor:'rgba(11,86,64,.08)', borderWidth:2.5,
          pointRadius:3, pointHoverRadius:5, pointBackgroundColor:'#0b5640', fill:true, tension:0.4 },
        { label:'% Físico Acum. Programado', data: rows.map(r => r.fis_acum_prog),
          borderColor:'#3fad72', borderWidth:2, borderDash:[6,3],
          pointRadius:3, pointHoverRadius:5, pointBackgroundColor:'#3fad72', fill:false, tension:0.4 },
        { label:'% Inv. Acum. Real', data: rows.map(r => r.inv_acum_real),
          borderColor:'#b91c1c', borderWidth:2.5, borderDash:[5,3],
          pointRadius:4, pointHoverRadius:6, pointBackgroundColor:'#b91c1c', fill:false, tension:0.3, spanGaps:false },
        { label:'% Físico Acum. Real', data: rows.map(r => r.fis_acum_real),
          borderColor:'#d97706', borderWidth:2.5, borderDash:[5,3],
          pointRadius:4, pointHoverRadius:6, pointBackgroundColor:'#d97706', fill:false, tension:0.3, spanGaps:false },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false, animation:{ duration:900, easing:'easeOutQuart' },
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ position:'bottom', labels:{ font:{family:'Prompt,sans-serif',size:11,weight:'600'}, color:'#6b7280', padding:14, usePointStyle:true, pointStyleWidth:18 } },
        tooltip:{ backgroundColor:'rgba(15,30,22,.92)', titleFont:{family:'Prompt,sans-serif',size:12,weight:'700'}, bodyFont:{family:'Prompt,sans-serif',size:11}, padding:10, cornerRadius:8, borderColor:'rgba(11,86,64,.4)', borderWidth:1,
          callbacks:{ label: i => { const n = parseFloat(i.raw); return !isNaN(n) ? ` ${i.dataset.label}: ${n.toFixed(2)}%` : null },
            afterBody: items => { const r = rows[items[0]?.dataIndex]; return r?.observacion ? [`\n📝 ${r.observacion}`] : [] } } }
      },
      scales:{
        x:{ grid:{color:'rgba(0,0,0,.05)',drawTicks:false}, border:{color:'#e5e7eb'}, ticks:{font:{family:'Prompt,sans-serif',size:10,weight:'500'},color:'#9ca3af',maxRotation:45,padding:6} },
        y:{ min:0, max:100, grid:{color:'rgba(0,0,0,.05)',drawTicks:false}, border:{dash:[4,3],color:'transparent'}, ticks:{font:{family:'Prompt,sans-serif',size:10,weight:'500'},color:'#9ca3af',padding:8,callback:v=>v+'%',stepSize:25} }
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
  <div v-if="!hasData" class="cs-empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    <p>Sin datos de Curva S para este circuito</p>
  </div>

  <div v-else class="cs-root">

    <!-- Pills info + subtabs -->
    <div class="cs-topbar">
      <div class="cs-meta">
        <span class="cs-pill">{{ data.subregion ?? '' }}</span>
        <span class="cs-pill cs-pill--green">{{ fmtCOP(data.valor_contrato) }}</span>
        <span class="cs-pill">Inicio: {{ data.fecha_inicio }}</span>
        <span class="cs-pill">Plazo: {{ data.plazo_meses }} meses</span>
      </div>
      <div class="cs-subtabs">
        <button :class="['cs-stab', subTab==='grafica' && 'cs-stab--active']" @click="subTab='grafica'">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polyline points="2,12 6,7 10,10 14,3"/></svg>
          Gráfica
        </button>
        <button :class="['cs-stab', subTab==='tabla' && 'cs-stab--active']" @click="subTab='tabla'">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="1" y="1" width="14" height="14" rx="2"/><line x1="1" y1="5" x2="15" y2="5"/><line x1="6" y1="5" x2="6" y2="15"/></svg>
          Tabla
        </button>
      </div>
    </div>

    <!-- Chart -->
    <div v-show="subTab==='grafica'" class="cs-chart-wrap"><canvas ref="canvasEl" /></div>

    <!-- Tabla -->
    <div v-show="subTab==='tabla'" class="cs-table-wrap">
      <table class="cs-tbl">
        <thead>
          <tr class="cs-thead-main">
            <th rowspan="2" class="th-num">MES<br>N°</th>
            <th rowspan="2" class="th-per">PERÍODO</th>
            <th colspan="2" class="th-group th-group--prog">INVERSIÓN PROGRAMADA</th>
            <th colspan="2" class="th-group th-group--prog">FÍSICO PROGRAMADO</th>
            <th colspan="2" class="th-group th-group--real">REAL (ingreso manual)</th>
            <th rowspan="2" class="th-val">VALOR ACUM.<br>PROG. ($)</th>
            <th rowspan="2" class="th-obs">OBSERVACIONES</th>
          </tr>
          <tr>
            <th class="th-sub">% Inv.<br>Prog. Mes</th>
            <th class="th-sub th-sub--acum">% Inv.<br>Acum. Prog.</th>
            <th class="th-sub">% Físico<br>Prog. Mes</th>
            <th class="th-sub th-sub--acum">% Físico<br>Acum. Prog.</th>
            <th class="th-sub th-sub--real">% Inv.<br>Acum. Real</th>
            <th class="th-sub th-sub--real">% Físico<br>Acum. Real</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in data.curva_s" :key="r.mes" :class="i%2===0 ? 'tr-even' : 'tr-odd'">
            <td class="td-num">{{ r.mes }}</td>
            <td class="td-per">{{ r.periodo }}</td>
            <td>{{ fmtPct(r.inv_prog_mes) }}</td>
            <td class="td-acum">{{ fmtPct(r.inv_acum_prog) }}</td>
            <td>{{ fmtPct(r.fis_prog_mes) }}</td>
            <td class="td-acum">{{ fmtPct(r.fis_acum_prog) }}</td>
            <td class="td-real">{{ r.inv_acum_real != null ? fmtPct(r.inv_acum_real) : '' }}</td>
            <td class="td-real">{{ r.fis_acum_real != null ? fmtPct(r.fis_acum_real) : '' }}</td>
            <td class="td-val">{{ fmtCOP(r.valor_acum_prog) }}</td>
            <td class="td-obs">{{ r.observacion }}</td>
          </tr>
        </tbody>
        <tfoot v-if="totals">
          <tr class="tr-total">
            <td colspan="2" class="td-total-label">TOTAL / FINAL</td>
            <td>{{ fmtPct(totals.inv_prog_mes) }}</td>
            <td class="td-acum">{{ fmtPct(totals.inv_acum_prog) }}</td>
            <td>{{ fmtPct(totals.fis_prog_mes) }}</td>
            <td class="td-acum">{{ fmtPct(totals.fis_acum_prog) }}</td>
            <td class="td-real">{{ totals.inv_acum_real != null ? fmtPct(totals.inv_acum_real) : '' }}</td>
            <td class="td-real">{{ totals.fis_acum_real != null ? fmtPct(totals.fis_acum_real) : '' }}</td>
            <td class="td-val">{{ fmtCOP(totals.valor_acum_prog) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

  </div>
</template>

<style scoped>
.cs-empty { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#c4c9d2;padding:32px }
.cs-empty svg { width:36px;height:36px }
.cs-empty p { margin:0;font-family:'Prompt',sans-serif;font-size:12.5px;text-align:center }

.cs-root { display:flex;flex-direction:column;gap:10px;flex:1;min-height:0 }

.cs-topbar { display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:8px }
.cs-meta { display:flex;gap:6px;flex-wrap:wrap }
.cs-pill {
  display:inline-flex;align-items:center;gap:5px;
  font-family:'Prompt',sans-serif;font-size:10px;font-weight:700;
  padding:3px 10px;border-radius:99px;background:#f0f4f2;color:#4b5563;letter-spacing:.03em
}
.cs-pill--green { background:#dcf5e8;color:#0b5640 }

.cs-subtabs { display:flex;gap:4px;flex-shrink:0 }
.cs-stab {
  display:inline-flex;align-items:center;gap:5px;
  font-family:'Prompt',sans-serif;font-size:10px;font-weight:700;
  padding:4px 12px;border-radius:6px;border:1px solid #e5e7eb;
  background:#f9fafb;color:#6b7280;cursor:pointer;transition:all .15s;outline:none
}
.cs-stab svg { width:13px;height:13px }
.cs-stab:hover { background:#f0fdf4;color:#0b5640;border-color:#bbf7d0 }
.cs-stab--active { background:#0b5640;color:#fff;border-color:#0b5640 }

.cs-chart-wrap { flex:1;min-height:0;position:relative }

.cs-table-wrap {
  flex:1;overflow:auto;min-height:0;
  border:1px solid #e5e7eb;border-radius:8px;
  scrollbar-width:thin;scrollbar-color:#e5e7eb transparent
}

.cs-tbl { width:100%;border-collapse:collapse;font-family:'Prompt',sans-serif;white-space:nowrap }

/* Header principal */
.cs-tbl thead tr:first-child th { background:#0b5640;color:#fff;font-size:9.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;padding:7px 10px;text-align:center;border-right:1px solid rgba(255,255,255,.2) }
.th-group--prog { background:#1a7a56 }
.th-group--real { background:#b45309 }

/* Sub-headers */
.cs-tbl thead tr:last-child th { background:#f9fafb;font-size:9px;font-weight:700;color:#6b7280;text-align:center;padding:5px 8px;border-bottom:2px solid #e5e7eb;border-right:1px solid #f0f0f0 }
.th-sub--acum { background:#f0fdf4;color:#0b5640 }
.th-sub--real { background:#fef3c7;color:#92400e }

/* Rows */
.tr-even { background:#fff }
.tr-odd  { background:#f9fafb }
.cs-tbl td { padding:6px 10px;font-size:11px;color:#374151;border-bottom:1px solid #f3f4f6;text-align:center;border-right:1px solid #f3f4f6 }

.td-num  { color:#9ca3af;font-size:10px;width:36px }
.td-per  { font-weight:700;color:#0b5640;text-align:left }
.td-acum { background:#f0fdf4;font-weight:700;color:#0b5640 }
.td-real { background:#fef9ec;font-weight:700;color:#92400e }
.td-val  { text-align:right;font-size:10.5px;color:#374151 }
.td-obs  { text-align:left;font-size:10.5px;color:#6b7280;max-width:200px;white-space:normal }

/* Footer */
.tr-total { background:#0b5640 }
.tr-total td { color:#fff;font-weight:800;font-size:11px;padding:7px 10px;border:none }
.tr-total .td-acum { background:rgba(255,255,255,.12);color:#fff }
.tr-total .td-real { background:rgba(245,158,11,.25);color:#fef3c7 }
.tr-total .td-val  { color:#fff }
.td-total-label { text-align:left;font-weight:800;letter-spacing:.04em }
</style>
