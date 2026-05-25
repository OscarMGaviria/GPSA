<script setup>
import { computed } from 'vue'
import cronogramas from '../../data/cronogramas.json'

const props = defineProps({ circuito: { type: String, default: '' } })
const norm = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const data = computed(() => {
  const q = norm(props.circuito)
  return cronogramas.circuitos.find(c => norm(c.circuito) === q) ?? null
})

const mr       = computed(() => data.value?.modulo_resiliente ?? null)
const estaciones = computed(() => mr.value?.estaciones ?? [])
const hasData  = computed(() => estaciones.value.length > 0)

const condicion = mrVal => {
  if (mrVal == null) return { label:'—', cls:'', icon:'' }
  if (mrVal >= 200)  return { label:'BUENA',      cls:'cond--ok',   icon:'✓' }
  if (mrVal >= 100)  return { label:'REGULAR',     cls:'cond--warn', icon:'⚠' }
  return               { label:'DEFICIENTE',  cls:'cond--bad',  icon:'✗' }
}

const fmtMr = v => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(1) }

const summary = computed(() => {
  const est = estaciones.value
  return {
    ok:   est.filter(e => e.mr_medido >= 200).length,
    warn: est.filter(e => e.mr_medido >= 100 && e.mr_medido < 200).length,
    bad:  est.filter(e => e.mr_medido < 100).length,
    total: est.length,
  }
})
</script>

<template>
  <div v-if="!mr" class="mr-empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 20h20M5 20V10l7-7 7 7v10"/></svg>
    <p>Sin datos de Módulo Resiliente para este circuito</p>
  </div>

  <div v-else class="mr-root">

    <!-- Meta pills -->
    <div class="mr-meta-pills">
      <span class="mr-mpill">{{ data.subregion }}</span>
      <span class="mr-mpill">{{ data.contratista ?? '—' }}</span>
      <span class="mr-mpill">Norma: {{ mr.norma }}</span>
    </div>

    <!-- Criterios -->
    <div class="mr-criterios">
      <span class="mr-crit crit--ok">  ≥ 200 MPa → ✓ BUENA</span>
      <span class="mr-crit crit--warn">100 – 199 → ⚠ REGULAR</span>
      <span class="mr-crit crit--bad"> &lt; 100 → ✗ DEFICIENTE</span>
    </div>

    <!-- Sin datos del contratista -->
    <div v-if="!hasData" class="mr-sin-datos">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>
        Hasta la fecha no se cuenta con la fórmula de trabajo para suministrar la información.
        El contratista no ha entregado los resultados de laboratorio. En tal virtud, las pestañas
        de módulo resiliente y ensayos de laboratorio se encuentran sin información.
      </p>
    </div>

    <!-- Tabla con datos -->
    <template v-else>
      <!-- Resumen pills -->
      <div class="mr-summary">
        <span class="mr-pill crit--ok">✓ Buena: {{ summary.ok }}</span>
        <span class="mr-pill crit--warn">⚠ Regular: {{ summary.warn }}</span>
        <span class="mr-pill crit--bad">✗ Deficiente: {{ summary.bad }}</span>
        <span class="mr-pill mr-pill--total">Total: {{ summary.total }} estaciones</span>
      </div>

      <div class="mr-table-wrap">
        <table class="mr-tbl">
          <thead>
            <tr>
              <th>ABSCISA<br><span class="th-unit">(km + m)</span></th>
              <th class="th-medido">Mr MEDIDO<br><span class="th-unit">(MPa)</span></th>
              <th class="th-proy">Mr PROYECTADO<br><span class="th-unit">(MPa) — diseño</span></th>
              <th>ΔMr<br><span class="th-unit">Med – Proy (MPa)</span></th>
              <th>Mr Med /<br>Mr Proy (%)</th>
              <th>CONDICIÓN<br>ESTRUCT.</th>
              <th>OBSERVACIONES</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(e, i) in estaciones" :key="i" :class="i%2===0?'tr-even':'tr-odd'">
              <td class="td-abs">{{ e.abscisa }}</td>
              <td class="td-medido" :class="condicion(e.mr_medido).cls">{{ fmtMr(e.mr_medido) }}</td>
              <td class="td-proy">{{ fmtMr(e.mr_proyectado ?? e.mr_disenho) }}</td>
              <td :class="(e.mr_medido - (e.mr_proyectado??e.mr_disenho)) >= 0 ? 'td-delta--ok' : 'td-delta--bad'">
                {{ e.mr_medido != null && (e.mr_proyectado??e.mr_disenho) != null
                    ? ((e.mr_medido - (e.mr_proyectado??e.mr_disenho)) >= 0 ? '+' : '') + fmtMr(e.mr_medido - (e.mr_proyectado??e.mr_disenho))
                    : '—' }}
              </td>
              <td>
                {{ e.mr_medido != null && (e.mr_proyectado??e.mr_disenho) != null
                    ? ((e.mr_medido / (e.mr_proyectado??e.mr_disenho)) * 100).toFixed(1) + '%'
                    : '—' }}
              </td>
              <td>
                <span class="cond-badge" :class="condicion(e.mr_medido).cls">
                  {{ condicion(e.mr_medido).icon }} {{ condicion(e.mr_medido).label }}
                </span>
              </td>
              <td class="td-obs">{{ e.observacion ?? '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

  </div>
</template>

<style scoped>
.mr-empty { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#c4c9d2;padding:32px }
.mr-empty svg { width:36px;height:36px }
.mr-empty p { margin:0;font-family:'Prompt',sans-serif;font-size:12.5px;text-align:center }

.mr-root { display:flex;flex-direction:column;gap:10px;flex:1;min-height:0 }

.mr-meta-pills { display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0 }
.mr-mpill { font-family:'Prompt',sans-serif;font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;background:#f0f4f2;color:#4b5563 }

.mr-criterios { display:flex;gap:10px;justify-content:center;flex-shrink:0 }
.mr-crit { font-family:'Prompt',sans-serif;font-size:10px;font-weight:700;padding:3px 12px;border-radius:99px }
.crit--ok   { background:#f0fdf4;color:#065f46;border:1px solid #bbf7d0 }
.crit--warn { background:#fef9ec;color:#78350f;border:1px solid #fde68a }
.crit--bad  { background:#fff1f2;color:#991b1b;border:1px solid #fecdd3 }

.mr-sin-datos {
  flex:1;display:flex;gap:14px;align-items:flex-start;
  background:#fef9ec;border:1px solid #fde68a;border-radius:10px;
  padding:20px;color:#78350f;
}
.mr-sin-datos svg { width:28px;height:28px;flex-shrink:0;color:#d97706;margin-top:2px }
.mr-sin-datos p { margin:0;font-family:'Prompt',sans-serif;font-size:12px;font-weight:500;line-height:1.6 }

.mr-summary { display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0 }
.mr-pill { display:inline-flex;align-items:center;gap:5px;font-family:'Prompt',sans-serif;font-size:10px;font-weight:700;padding:3px 12px;border-radius:99px;border:1px solid transparent }
.mr-pill--total { background:#f0f4f2;color:#4b5563;border-color:#e5e7eb }

.mr-table-wrap { flex:1;min-height:0;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;scrollbar-width:thin;scrollbar-color:#e5e7eb transparent }

.mr-tbl { width:100%;border-collapse:collapse;font-family:'Prompt',sans-serif;white-space:nowrap }
.mr-tbl thead tr { background:#0b5640 }
.mr-tbl th { padding:8px 12px;font-size:9.5px;font-weight:700;color:#fff;text-align:center;letter-spacing:.04em;text-transform:uppercase;border-right:1px solid rgba(255,255,255,.15) }
.th-unit { font-size:8px;font-weight:500;opacity:.75;text-transform:none }

.tr-even { background:#fff }
.tr-odd  { background:#f9fafb }
.mr-tbl td { padding:7px 12px;font-size:11px;color:#374151;border-bottom:1px solid #f3f4f6;text-align:center;border-right:1px solid #f3f4f6 }

.td-abs    { font-family:monospace;font-size:11px;font-weight:700;color:#0b5640;text-align:left }
.td-medido { font-weight:800;font-size:12.5px }
.td-proy   { font-weight:600;color:#374151 }
.td-delta--ok  { color:#0b5640;font-weight:700 }
.td-delta--bad { color:#b91c1c;font-weight:700 }
.td-obs    { text-align:left;white-space:normal;max-width:200px;font-size:11px;color:#6b7280 }

.cond--ok   { color:#065f46 }
.cond--warn { color:#92400e }
.cond--bad  { color:#991b1b }

.cond-badge { display:inline-block;padding:3px 10px;border-radius:4px;font-size:9.5px;font-weight:700;letter-spacing:.04em }
.cond-badge.cond--ok   { background:#f0fdf4;color:#065f46;border:1px solid #bbf7d0 }
.cond-badge.cond--warn { background:#fef9ec;color:#78350f;border:1px solid #fde68a }
.cond-badge.cond--bad  { background:#fff1f2;color:#991b1b;border:1px solid #fecdd3 }
</style>
