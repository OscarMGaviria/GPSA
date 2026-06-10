<script setup>
import { computed } from 'vue'
import cronogramas from '../../data/cronogramas.json'

const props = defineProps({ circuito: { type: String, default: '' } })
const norm = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const data = computed(() => {
  const q = norm(props.circuito)
  return cronogramas.circuitos.find(c => norm(c.circuito) === q) ?? null
})

const puntos  = computed(() => data.value?.ensayos_matricial ?? [])
const hasData = computed(() => puntos.value.length > 0)

// Definición de columnas por etapa
const ETAPA1 = [
  { key:'e1_e142',  label:'PROC',    norma:'E-142'     },
  { key:'e1_e148i', label:'CBR-I',   norma:'E-148'     },
  { key:'e1_e148c', label:'CBR-C',   norma:'E-148'     },
  { key:'e1_e172',  label:'DCP',     norma:'E-172'     },
]
const ETAPA2 = [
  { key:'e2_e213',     label:'GRAN2',  norma:'E-213'       },
  { key:'e2_e125126',  label:'LL-LP2', norma:'E-125/126'   },
  { key:'e2_e122',     label:'HUM2',   norma:'E-122'       },
  { key:'e2_une103204',label:'ORG',    norma:'UNE103204'   },
  { key:'e2_e133',     label:'EA',     norma:'E-133'       },
  { key:'e2_e235',     label:'AZM',    norma:'E-235'       },
  { key:'e2_une103201',label:'SAL',    norma:'UNE103201'   },
  { key:'e2_e132',     label:'EXP',    norma:'E-132'       },
]
const ETAPA3 = [
  { key:'e3_e142',    label:'PROC3', norma:'E-142'     },
  { key:'e3_e148',    label:'CBR3',  norma:'E-148'     },
  { key:'e3_e601',    label:'PH',    norma:'E-601'     },
  { key:'e3_e414613', label:'FLEX',  norma:'E-414/613' },
  { key:'e3_e613614', label:'DSC',   norma:'E-613/614' },
]
const ALL_COLS = [...ETAPA1, ...ETAPA2, ...ETAPA3]

const pctCumple = p => {
  const done = ALL_COLS.filter(c => p[c.key]?.fecha).length
  return Math.round(done / ALL_COLS.length * 100)
}

const cellVal = (p, key) => p[key]
</script>

<template>
  <div v-if="!data" class="ev-empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    <p>Sin datos de ensayos para este circuito</p>
  </div>

  <div v-else class="ev-root">

    <!-- Meta pills -->
    <div class="ev-meta-pills">
      <span class="ev-mpill">{{ data.contratista ?? '—' }}</span>
      <span class="ev-mpill">{{ data.contrato ?? '—' }}</span>
      <span class="ev-mpill ev-mpill--legend">✓ realizado &nbsp;·&nbsp; fecha DD/MM/AAAA &nbsp;·&nbsp; resultado = valor</span>
    </div>

    <!-- Sin datos del contratista (mismo aviso que MR) -->
    <div v-if="!hasData" class="ev-sin-datos">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <p>
        El contratista no ha entregado los resultados de laboratorio de los doce apiques realizados.
        La pestaña se encuentra sin información hasta que se reciba la fórmula de trabajo.
      </p>
    </div>

    <!-- Tabla matricial -->
    <div v-else class="ev-table-wrap">
      <table class="ev-tbl">
        <thead>
          <!-- Fila 1: etapas -->
          <tr>
            <th rowspan="3" class="th-fix th-abs">ABSCISA /<br>PUNTO<br>(km+m)</th>
            <th rowspan="3" class="th-fix th-etapa">ETAPA</th>
            <th rowspan="3" class="th-fix th-tramo">TRAMO<br>HOMOGÉNEO</th>
            <th :colspan="ETAPA1.length" class="th-group th-e1">ETAPA 1 — APIQUES (c/250m)</th>
            <th :colspan="ETAPA2.length" class="th-group th-e2">ETAPA 2 — GRANULARES SUPERFICIALES (0–40cm)</th>
            <th :colspan="ETAPA3.length" class="th-group th-e3">ETAPA 3 — FÓRMULA DE TRABAJO (tramo homogéneo)</th>
            <th rowspan="3" class="th-fix th-pct">% CUMPLI-<br>MIENTO</th>
          </tr>
          <!-- Fila 2: normas -->
          <tr>
            <th v-for="c in ETAPA1" :key="c.key" class="th-norma th-norma--e1">{{ c.norma }}</th>
            <th v-for="c in ETAPA2" :key="c.key" class="th-norma th-norma--e2">{{ c.norma }}</th>
            <th v-for="c in ETAPA3" :key="c.key" class="th-norma th-norma--e3">{{ c.norma }}</th>
          </tr>
          <!-- Fila 3: abreviaturas -->
          <tr>
            <th v-for="c in ETAPA1" :key="c.key" class="th-abbr th-abbr--e1">{{ c.label }}</th>
            <th v-for="c in ETAPA2" :key="c.key" class="th-abbr th-abbr--e2">{{ c.label }}</th>
            <th v-for="c in ETAPA3" :key="c.key" class="th-abbr th-abbr--e3">{{ c.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in puntos" :key="i" :class="i%2===0?'tr-even':'tr-odd'">
            <td class="td-abs">{{ p.abscisa }}</td>
            <td class="td-etapa">{{ p.etapa }}</td>
            <td class="td-tramo">{{ p.tramo }}</td>
            <td v-for="c in [...ETAPA1,...ETAPA2,...ETAPA3]" :key="c.key"
                class="td-cell"
                :class="cellVal(p,c.key)?.fecha ? 'cell--done' : 'cell--empty'">
              <template v-if="cellVal(p,c.key)?.fecha">
                <span class="cell-fecha">{{ cellVal(p,c.key).fecha }}</span>
                <span v-if="cellVal(p,c.key).valor != null" class="cell-val">{{ cellVal(p,c.key).valor }}</span>
              </template>
            </td>
            <td class="td-pct">
              <span class="pct-badge" :class="pctCumple(p)===100?'pct--full':pctCumple(p)>0?'pct--partial':'pct--zero'">
                {{ pctCumple(p) }}%
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style scoped>
.ev-empty { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#c4c9d2;padding:32px }
.ev-empty svg { width:36px;height:36px }
.ev-empty p { margin:0;font-family:'Prompt',sans-serif;font-size:12.5px;text-align:center }

.ev-root { display:flex;flex-direction:column;gap:8px;flex:1;min-height:0 }

.ev-meta-pills { display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;align-items:center }
.ev-mpill { font-family:'Prompt',sans-serif;font-size:10px;font-weight:700;padding:3px 10px;border-radius:99px;background:#f0f4f2;color:#4b5563 }
.ev-mpill--legend { background:#f0fdf4;color:#0b5640;font-weight:500;font-size:9.5px }

.ev-sin-datos { flex:1;display:flex;gap:14px;align-items:flex-start;background:#fef9ec;border:1px solid #fde68a;border-radius:10px;padding:20px;color:#78350f }
.ev-sin-datos svg { width:28px;height:28px;flex-shrink:0;color:#d97706;margin-top:2px }
.ev-sin-datos p { margin:0;font-family:'Prompt',sans-serif;font-size:12px;font-weight:500;line-height:1.6 }

.ev-table-wrap { flex:1;min-height:0;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;scrollbar-width:thin;scrollbar-color:#e5e7eb transparent }

.ev-tbl { border-collapse:collapse;font-family:'Prompt',sans-serif;white-space:nowrap }

/* Grupos de cabecera */
.th-group { font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;text-align:center;padding:6px 10px;border-right:2px solid rgba(255,255,255,.3) }
.th-e1 { background:#374151;color:#fff }
.th-e2 { background:#0b5640;color:#fff }
.th-e3 { background:#6d28d9;color:#fff }

.th-norma { font-size:8px;font-weight:700;text-align:center;padding:4px 6px }
.th-norma--e1 { background:#4b5563;color:#fff }
.th-norma--e2 { background:#1a7a56;color:#fff }
.th-norma--e3 { background:#7c3aed;color:#fff }

.th-abbr { font-size:9px;font-weight:800;text-align:center;padding:4px 8px;border-bottom:2px solid rgba(0,0,0,.1) }
.th-abbr--e1 { background:#f3f4f6;color:#374151 }
.th-abbr--e2 { background:#f0fdf4;color:#0b5640 }
.th-abbr--e3 { background:#f5f3ff;color:#6d28d9 }

.th-fix { background:#0b5640;color:#fff;font-size:9px;font-weight:700;letter-spacing:.04em;text-align:center;padding:6px 8px;text-transform:uppercase;vertical-align:middle }
.th-abs { min-width:80px }
.th-etapa { min-width:52px }
.th-tramo { min-width:80px }
.th-pct   { min-width:64px;background:#374151 }

.tr-even { background:#fffde7 }
.tr-odd  { background:#f9fafb }

.ev-tbl td { padding:5px 6px;font-size:10.5px;border-bottom:1px solid rgba(0,0,0,.06);border-right:1px solid rgba(0,0,0,.05);text-align:center;vertical-align:top }

.td-abs   { font-family:monospace;font-size:10.5px;font-weight:700;color:#0b5640;text-align:left;padding-left:8px }
.td-etapa { font-size:10px;color:#6b7280;font-weight:600 }
.td-tramo { font-size:10px;color:#374151 }

.td-cell { min-width:68px;padding:3px 5px }
.cell--done  { background:#dcf5e8 }
.cell--empty { background:transparent }
.cell-fecha { display:block;font-size:8.5px;color:#0b5640;font-weight:700 }
.cell-val   { display:block;font-size:8px;color:#374151 }

.td-pct { font-weight:700 }
.pct-badge { padding:2px 8px;border-radius:99px;font-size:9px;font-weight:700 }
.pct--full    { background:#dcf5e8;color:#065f46 }
.pct--partial { background:#fef3c7;color:#92400e }
.pct--zero    { background:#f3f4f6;color:#9ca3af }
</style>
