<script setup>
import { ref, computed, watch } from 'vue'

// ── Estado global ─────────────────────────────────────────────────────────────
const dbData   = ref(null)
const loading  = ref(true)
const saving   = ref(false)
const saveMsg  = ref('')
const activeTab = ref('curva_s')

async function loadData() {
  loading.value = true
  const r = await fetch('/api/cronogramas')
  dbData.value = await r.json()
  loading.value = false
}
loadData()

async function saveData() {
  saving.value = true; saveMsg.value = ''
  try {
    const r = await fetch('/api/cronogramas', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(dbData.value) })
    const j = await r.json()
    saveMsg.value = j.ok ? '✓ Guardado correctamente' : '✗ Error: ' + j.error
  } catch(e) { saveMsg.value = '✗ Error de conexión' }
  saving.value = false
  setTimeout(() => saveMsg.value = '', 3000)
}

// ── Circuito seleccionado ─────────────────────────────────────────────────────
const selectedIdx = ref(0)
const circuitos   = computed(() => dbData.value?.circuitos ?? [])
const c           = computed(() => circuitos.value[selectedIdx.value] ?? null)

// ── Helpers format ────────────────────────────────────────────────────────────
const fmtCOP = v => v != null ? new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v) : '—'

// ── Ensayos: añadir fila ──────────────────────────────────────────────────────
function addPunto() {
  if (!c.value) return
  if (!c.value.ensayos_matricial) c.value.ensayos_matricial = []
  c.value.ensayos_matricial.push({ abscisa:'', etapa:'', tramo:'',
    e1_e142:null,e1_e148i:null,e1_e148c:null,e1_e172:null,
    e2_e213:null,e2_e125126:null,e2_e122:null,e2_une103204:null,e2_e133:null,e2_e235:null,e2_une103201:null,e2_e132:null,
    e3_e142:null,e3_e148:null,e3_e601:null,e3_e414613:null,e3_e613614:null
  })
}
function removePunto(i) { c.value.ensayos_matricial.splice(i, 1) }

// ── MR: añadir/quitar estación ────────────────────────────────────────────────
function addEstacion() {
  if (!c.value) return
  if (!c.value.modulo_resiliente) c.value.modulo_resiliente = { norma:'AASHTO T-307 / INV E-148', criterios:[], estaciones:[] }
  c.value.modulo_resiliente.estaciones.push({ abscisa:'', mr_medido:null, mr_proyectado:null, observacion:'' })
}
function removeEstacion(i) { c.value.modulo_resiliente.estaciones.splice(i, 1) }

// ── Gantt: actividades ────────────────────────────────────────────────────────
// Se editan inicio_mes, duracion_meses y avance_pct

const ENSAYO_COLS = [
  { key:'e1_e142',     label:'E-142 PROC'       },
  { key:'e1_e148i',    label:'E-148 CBR-I'      },
  { key:'e1_e148c',    label:'E-148 CBR-C'      },
  { key:'e1_e172',     label:'E-172 DCP'        },
  { key:'e2_e213',     label:'E-213 GRAN'       },
  { key:'e2_e125126',  label:'E-125/126 LL-LP'  },
  { key:'e2_e122',     label:'E-122 HUM'        },
  { key:'e2_une103204',label:'UNE103204 ORG'    },
  { key:'e2_e133',     label:'E-133 EA'         },
  { key:'e2_e235',     label:'E-235 AZM'        },
  { key:'e2_une103201',label:'UNE103201 SAL'    },
  { key:'e2_e132',     label:'E-132 EXP'        },
  { key:'e3_e142',     label:'E-142 PROC3'      },
  { key:'e3_e148',     label:'E-148 CBR3'       },
  { key:'e3_e601',     label:'E-601 PH'         },
  { key:'e3_e414613',  label:'E-414/613 FLEX'   },
  { key:'e3_e613614',  label:'E-613/614 DSC'    },
]

// ── Paste desde Excel ─────────────────────────────────────────────────────────
// Detecta TSV en el portapapeles y rellena la grilla de datos a partir de la
// celda activa. Funciona en las 3 tablas editables.
function makePasteHandler(getRows, colMap) {
  return (event) => {
    const input = event.target
    if (input.tagName !== 'INPUT') return
    const td = input.closest('td')
    const tr = td?.closest('tr')
    if (!td || !tr) return
    const tbody  = tr.closest('tbody')
    if (!tbody) return
    const trs    = [...tbody.querySelectorAll(':scope > tr')]
    const rowIdx = trs.indexOf(tr)
    const tds    = [...tr.querySelectorAll(':scope > td')]
    const colIdx = tds.indexOf(td)
    const text   = (event.clipboardData ?? window.clipboardData)?.getData('text') ?? ''
    const lines  = text.trim().split(/\r?\n/)
    if (lines.length === 1 && !lines[0].includes('\t')) return
    event.preventDefault()
    const rows = getRows()
    lines.forEach((line, ri) => {
      const r = rowIdx + ri
      if (r >= rows.length) return
      line.split('\t').forEach((val, ci) => {
        const field = colMap[colIdx + ci]
        if (!field || !rows[r]) return
        const clean = val.trim().replace(',', '.')
        const num   = parseFloat(clean)
        rows[r][field] = isNaN(num) ? (clean === '' ? null : clean) : num
      })
    })
  }
}

const COL_CURVA_S = [null, null, 'inv_prog_mes', 'inv_acum_prog', 'fis_prog_mes', 'fis_acum_prog', 'inv_acum_real', 'fis_acum_real', 'valor_acum_prog', 'observacion']
const COL_GANTT   = [null, null, 'inicio_mes', 'duracion_meses', 'avance_pct']
const COL_VG      = [null, null, 'pv_acum', 'ev_acum', 'ac_acum']

const pasteCurvaS = makePasteHandler(() => c.value?.curva_s      ?? [], COL_CURVA_S)
const pasteGantt  = makePasteHandler(() => c.value?.actividades  ?? [], COL_GANTT)
const pasteVG     = makePasteHandler(() => c.value?.valor_ganado ?? [], COL_VG)
</script>

<template>
  <div class="adm-root">

    <!-- Barra superior -->
    <header class="adm-header">
      <div class="adm-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
        SIMEVA — Admin
      </div>
      <div class="adm-circuit-sel">
        <label>Circuito</label>
        <select v-model="selectedIdx" :disabled="loading">
          <option v-for="(cx, i) in circuitos" :key="i" :value="i">{{ cx.circuito }}</option>
        </select>
      </div>
      <div class="adm-actions">
        <span class="save-msg" :class="saveMsg.startsWith('✓') ? 'msg--ok' : 'msg--bad'">{{ saveMsg }}</span>
        <button class="btn-save" :disabled="saving || loading" @click="saveData">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {{ saving ? 'Guardando…' : 'Guardar JSON' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="adm-loading">Cargando datos…</div>

    <div v-else-if="c" class="adm-body">

      <!-- Tabs -->
      <nav class="adm-tabs">
        <button v-for="t in [
          {id:'curva_s',    label:'Curva S'},
          {id:'valor_ganado',label:'Valor Ganado'},
          {id:'gantt',      label:'Gantt'},
          {id:'mr',         label:'Mód. Resiliente'},
          {id:'ensayos',    label:'Ensayos Lab.'},
        ]" :key="t.id" class="adm-tab" :class="{active: activeTab===t.id}" @click="activeTab=t.id">
          {{ t.label }}
        </button>
      </nav>

      <!-- ════ CURVA S ════ -->
      <div v-if="activeTab==='curva_s'" class="adm-panel">
        <p class="adm-hint">Edita los valores <strong>programados</strong> (blanco) y <strong>reales</strong> (amarillo). Pega rangos directamente desde Excel con Ctrl+V sobre la primera celda.</p>
        <div class="tbl-wrap">
          <table class="adm-tbl" @paste="pasteCurvaS">
            <thead>
              <tr>
                <th>MES</th><th>PERÍODO</th>
                <th>% Inv. Prog. Mes</th><th>% Inv. Acum. Prog.</th>
                <th>% Fís. Prog. Mes</th><th>% Fís. Acum. Prog.</th>
                <th class="th-real">% Inv. Acum. Real</th>
                <th class="th-real">% Fís. Acum. Real</th>
                <th>Valor Acum. Prog.</th>
                <th class="th-real">Observación</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in c.curva_s" :key="r.mes">
                <td>{{ r.mes }}</td>
                <td class="td-per">{{ r.periodo }}</td>
                <td><input type="number" step="0.01" v-model.number="r.inv_prog_mes"  class="inp-num" /></td>
                <td><input type="number" step="0.01" v-model.number="r.inv_acum_prog" class="inp-num" /></td>
                <td><input type="number" step="0.01" v-model.number="r.fis_prog_mes"  class="inp-num" /></td>
                <td><input type="number" step="0.01" v-model.number="r.fis_acum_prog" class="inp-num" /></td>
                <td class="td-real"><input type="number" step="0.01" v-model.number="r.inv_acum_real" class="inp-num" /></td>
                <td class="td-real"><input type="number" step="0.01" v-model.number="r.fis_acum_real" class="inp-num" /></td>
                <td><input type="number" step="1" v-model.number="r.valor_acum_prog" class="inp-num" style="width:110px" /></td>
                <td class="td-real td-obs"><input type="text" v-model="r.observacion" class="inp-txt" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ════ VALOR GANADO ════ -->
      <div v-if="activeTab==='valor_ganado'" class="adm-panel">
        <p class="adm-hint">Edita <strong>PV (BASE)</strong> y los valores reales <strong>EV / AC (REAL)</strong> (amarillo). Pega rangos directamente desde Excel con Ctrl+V sobre la primera celda.</p>
        <div class="adm-bac-row">
          <label>BAC EVM ($)</label>
          <input type="number" v-model.number="c.bac_evm" class="inp-bac" />
        </div>
        <div class="tbl-wrap">
          <table class="adm-tbl" @paste="pasteVG">
            <thead>
              <tr>
                <th>MES</th><th>PERÍODO</th>
                <th>PV Acum. — BASE ($)</th>
                <th class="th-real">EV Acum. ($)</th>
                <th class="th-real">AC Acum. — REAL ($)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in c.valor_ganado" :key="r.mes">
                <td>{{ r.mes }}</td>
                <td class="td-per">{{ r.periodo }}</td>
                <td><input type="number" v-model.number="r.pv_acum" class="inp-num" style="width:110px" placeholder="—" /></td>
                <td class="td-real"><input type="number" v-model.number="r.ev_acum" class="inp-num" placeholder="—" /></td>
                <td class="td-real"><input type="number" v-model.number="r.ac_acum" class="inp-num" placeholder="—" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ════ GANTT ════ -->
      <div v-if="activeTab==='gantt'" class="adm-panel">
        <p class="adm-hint">Edita <strong>inicio</strong> y <strong>duración</strong> del cronograma, y el <strong>% de avance</strong> (amarillo). Pega rangos directamente desde Excel con Ctrl+V sobre la primera celda.</p>
        <div class="tbl-wrap">
          <table class="adm-tbl" @paste="pasteGantt">
            <thead>
              <tr><th>ID</th><th>Actividad</th><th>Inicio Mes</th><th>Duración (meses)</th><th class="th-real">Avance %</th></tr>
            </thead>
            <tbody>
              <tr v-for="a in c.actividades" :key="a.id">
                <td>{{ a.id }}</td>
                <td class="td-per">{{ a.nombre }}</td>
                <td><input type="number" min="1" step="1" v-model.number="a.inicio_mes"     class="inp-num" /></td>
                <td><input type="number" min="1" step="1" v-model.number="a.duracion_meses" class="inp-num" /></td>
                <td class="td-real"><input type="number" min="0" max="100" step="1" v-model.number="a.avance_pct" class="inp-num" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ════ MÓDULO RESILIENTE ════ -->
      <div v-if="activeTab==='mr'" class="adm-panel">
        <div class="adm-panel-actions">
          <p class="adm-hint">Registra las estaciones de ensayo de módulo resiliente.</p>
          <button class="btn-add" @click="addEstacion">+ Añadir estación</button>
        </div>
        <div class="adm-norma-row">
          <label>Norma</label>
          <input type="text" v-model="c.modulo_resiliente.norma" class="inp-txt" style="width:320px" />
        </div>
        <div class="tbl-wrap">
          <table class="adm-tbl">
            <thead>
              <tr>
                <th>Abscisa</th>
                <th class="th-real">Mr Medido (MPa)</th>
                <th>Mr Proyectado (MPa)</th>
                <th>Observación</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in c.modulo_resiliente.estaciones" :key="i">
                <td><input type="text" v-model="e.abscisa" class="inp-txt" placeholder="K0+250" /></td>
                <td class="td-real"><input type="number" step="0.1" v-model.number="e.mr_medido" class="inp-num" /></td>
                <td><input type="number" step="0.1" v-model.number="e.mr_proyectado" class="inp-num" /></td>
                <td><input type="text" v-model="e.observacion" class="inp-txt" /></td>
                <td><button class="btn-del" @click="removeEstacion(i)">✕</button></td>
              </tr>
              <tr v-if="!c.modulo_resiliente?.estaciones?.length">
                <td colspan="5" class="td-empty">Sin estaciones registradas</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ════ ENSAYOS MATRICIAL ════ -->
      <div v-if="activeTab==='ensayos'" class="adm-panel">
        <div class="adm-panel-actions">
          <p class="adm-hint">Para cada abscisa, registra fecha y resultado de los ensayos realizados.</p>
          <button class="btn-add" @click="addPunto">+ Añadir punto</button>
        </div>
        <div class="tbl-wrap">
          <table class="adm-tbl adm-tbl--matrix">
            <thead>
              <tr>
                <th>Abscisa</th><th>Etapa</th><th>Tramo</th>
                <th v-for="col in ENSAYO_COLS" :key="col.key">{{ col.label }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in c.ensayos_matricial" :key="i">
                <td><input type="text" v-model="p.abscisa"   class="inp-sm" placeholder="K0+000"/></td>
                <td><input type="text" v-model="p.etapa"     class="inp-sm" placeholder="1"/></td>
                <td><input type="text" v-model="p.tramo"     class="inp-sm" placeholder="TH-01"/></td>
                <td v-for="col in ENSAYO_COLS" :key="col.key" class="td-matrix">
                  <div class="matrix-cell">
                    <input type="text" :value="p[col.key]?.fecha ?? ''" @input="e => { if(!p[col.key]) p[col.key]={}; p[col.key].fecha=e.target.value }" class="inp-fecha" placeholder="dd/mm/aa" />
                    <input type="text" :value="p[col.key]?.valor ?? ''" @input="e => { if(!p[col.key]) p[col.key]={}; p[col.key].valor=e.target.value }" class="inp-val" placeholder="valor" />
                  </div>
                </td>
                <td><button class="btn-del" @click="removePunto(i)">✕</button></td>
              </tr>
              <tr v-if="!c.ensayos_matricial?.length">
                <td :colspan="3+ENSAYO_COLS.length+1" class="td-empty">Sin puntos registrados</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.adm-root { min-height:100vh;background:#f3f4f6;font-family:'Prompt',sans-serif;display:flex;flex-direction:column }

/* Header */
.adm-header {
  background:linear-gradient(110deg,#052318 0%,#0b5640 55%,#1a7a56 100%);
  padding:12px 24px;display:flex;align-items:center;gap:20px;flex-shrink:0;
}
.adm-brand { display:flex;align-items:center;gap:8px;font-size:14px;font-weight:800;color:#fff;letter-spacing:.04em }
.adm-brand svg { width:18px;height:18px }
.adm-circuit-sel { display:flex;align-items:center;gap:8px;flex:1 }
.adm-circuit-sel label { font-size:11px;font-weight:700;color:rgba(255,255,255,.6);letter-spacing:.06em;text-transform:uppercase }
.adm-circuit-sel select { padding:6px 12px;border-radius:7px;border:1.5px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;font-family:'Prompt',sans-serif;font-size:12px;font-weight:600;min-width:260px;cursor:pointer }
.adm-circuit-sel select:focus { outline:none }
.adm-actions { display:flex;align-items:center;gap:10px }
.save-msg { font-size:11px;font-weight:600 }
.msg--ok  { color:#a7f3d0 }
.msg--bad { color:#fca5a5 }
.btn-save { display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:7px;border:1.5px solid rgba(255,255,255,.4);background:rgba(255,255,255,.15);color:#fff;font-family:'Prompt',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:background .14s }
.btn-save svg { width:13px;height:13px }
.btn-save:hover:not(:disabled) { background:rgba(255,255,255,.25) }
.btn-save:disabled { opacity:.5;cursor:not-allowed }

.adm-loading { flex:1;display:flex;align-items:center;justify-content:center;font-size:13px;color:#9ca3af }

/* Body */
.adm-body { flex:1;display:flex;flex-direction:column;padding:16px 20px;gap:12px;overflow:hidden }

/* Tabs */
.adm-tabs { display:flex;gap:3px;flex-shrink:0 }
.adm-tab { padding:7px 16px;border-radius:8px 8px 0 0;border:1px solid #e5e7eb;border-bottom:none;background:#fff;font-family:'Prompt',sans-serif;font-size:12px;font-weight:600;color:#6b7280;cursor:pointer;transition:background .12s,color .12s }
.adm-tab:focus { outline:none }
.adm-tab.active { background:#0b5640;color:#fff;border-color:#0b5640 }

/* Panel */
.adm-panel { flex:1;background:#fff;border:1px solid #e5e7eb;border-radius:0 8px 8px 8px;padding:16px;display:flex;flex-direction:column;gap:10px;overflow:hidden;min-height:0 }
.adm-hint { margin:0;font-size:11.5px;color:#6b7280 }
.adm-panel-actions { display:flex;align-items:center;justify-content:space-between;flex-shrink:0 }
.adm-bac-row,.adm-norma-row { display:flex;align-items:center;gap:10px;flex-shrink:0 }
.adm-bac-row label,.adm-norma-row label { font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em }

/* Tabla */
.tbl-wrap { flex:1;overflow:auto;min-height:0;border:1px solid #e5e7eb;border-radius:7px;scrollbar-width:thin;scrollbar-color:#e5e7eb transparent }
.adm-tbl { width:100%;border-collapse:collapse;white-space:nowrap;font-family:'Prompt',sans-serif }
.adm-tbl th { position:sticky;top:0;background:#f9fafb;padding:7px 10px;font-size:9.5px;font-weight:700;color:#6b7280;text-align:left;letter-spacing:.05em;text-transform:uppercase;border-bottom:2px solid #e5e7eb }
.th-real { background:#fef3c7;color:#92400e }
.adm-tbl td { padding:5px 8px;font-size:11.5px;border-bottom:1px solid #f3f4f6 }
.td-per  { font-weight:700;color:#0b5640 }
.td-real { background:#fef9ec }
.td-obs  { min-width:200px }
.td-empty { text-align:center;color:#9ca3af;padding:20px;font-size:12px }
.td-matrix { padding:3px 4px;vertical-align:top }

/* Inputs */
.inp-num  { width:80px;padding:4px 7px;border:1px solid #e5e7eb;border-radius:5px;font-family:'Prompt',sans-serif;font-size:11.5px;text-align:right }
.inp-num:focus { outline:none;border-color:#0b5640 }
.inp-txt  { width:100%;padding:4px 7px;border:1px solid #e5e7eb;border-radius:5px;font-family:'Prompt',sans-serif;font-size:11.5px }
.inp-txt:focus { outline:none;border-color:#0b5640 }
.inp-bac  { width:200px;padding:5px 9px;border:1.5px solid #e5e7eb;border-radius:6px;font-family:'Prompt',sans-serif;font-size:12px;font-weight:600 }
.inp-bac:focus { outline:none;border-color:#0b5640 }
.inp-sm   { width:72px;padding:3px 6px;border:1px solid #e5e7eb;border-radius:4px;font-family:'Prompt',sans-serif;font-size:10.5px }
.inp-sm:focus { outline:none;border-color:#0b5640 }

.matrix-cell { display:flex;flex-direction:column;gap:1px }
.inp-fecha { width:70px;padding:2px 4px;border:1px solid #e5e7eb;border-radius:3px;font-size:9px;color:#0b5640;font-family:'Prompt',sans-serif }
.inp-val   { width:70px;padding:2px 4px;border:1px solid #e5e7eb;border-radius:3px;font-size:9px;font-family:'Prompt',sans-serif }
.inp-fecha:focus,.inp-val:focus { outline:none;border-color:#0b5640 }

.btn-add { padding:6px 14px;border-radius:7px;border:1.5px solid #0b5640;background:#f0fdf4;color:#0b5640;font-family:'Prompt',sans-serif;font-size:12px;font-weight:700;cursor:pointer;transition:background .12s }
.btn-add:hover { background:#dcf5e8 }
.btn-del { padding:3px 8px;border-radius:5px;border:none;background:#fee2e2;color:#b91c1c;font-size:11px;font-weight:700;cursor:pointer }
.btn-del:hover { background:#fecaca }
</style>
