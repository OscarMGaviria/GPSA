<script setup>
import { ref, computed } from 'vue'

// ── Estado ────────────────────────────────────────────────────────────────────
const data    = ref({ compromisos: [], dificultades: [] })
const loading = ref(true)
const saving  = ref(false)
const saveMsg = ref('')
const tab     = ref('compromisos')

// Filtros
const fC = ref({ search: '', tipo: '', estado: '', prioridad: '' })
const fD = ref({ search: '', tipo: '', severidad: '', estado: '' })

// Modal
const modal     = ref(false)
const modalKind = ref('compromiso')
const editId    = ref(null)
const form      = ref({})

// ── API ───────────────────────────────────────────────────────────────────────
async function loadData() {
  loading.value = true
  const r = await fetch('/api/compromisos')
  data.value = await r.json()
  loading.value = false
}
loadData()

const circuitos = ref([])
async function loadCircuitos() {
  try {
    const r  = await fetch('/data/localizacion.geojson')
    const gj = await r.json()
    circuitos.value = [...new Set(
      gj.features.map(f => f.properties.CIRCUITO).filter(Boolean)
    )].sort()
  } catch { circuitos.value = [] }
}
loadCircuitos()

async function saveData() {
  saving.value = true
  saveMsg.value = ''
  try {
    const r = await fetch('/api/compromisos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data.value),
    })
    const j = await r.json()
    saveMsg.value = j.ok ? '✓ Guardado' : '✗ Error: ' + j.error
  } catch { saveMsg.value = '✗ Error de conexión' }
  saving.value = false
  setTimeout(() => saveMsg.value = '', 3000)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const today = () => new Date().toISOString().slice(0, 10)
const isVencido = c =>
  (c.estado === 'pendiente' || c.estado === 'en_proceso') &&
  c.fechaCompromiso && new Date(c.fechaCompromiso) < new Date()

const fmtFecha = iso => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── Plantillas en blanco ───────────────────────────────────────────────────────
const blankC = () => ({
  id: uid(), circuito: '', nombreVia: '', tipo: 'obra',
  descripcion: '', responsable: '', fechaCompromiso: '',
  fechaRegistro: today(), estado: 'pendiente', prioridad: 'media', observaciones: '',
})
const blankD = () => ({
  id: uid(), circuito: '', nombreVia: '', tipo: 'tecnica',
  descripcion: '', responsable: '', severidad: 'media',
  estado: 'activa', fechaRegistro: today(), observaciones: '',
})

// ── Listas filtradas ──────────────────────────────────────────────────────────
const compromisosFilt = computed(() => {
  const { search, tipo, estado, prioridad } = fC.value
  const q = search.toLowerCase()
  return data.value.compromisos.filter(c => {
    if (tipo      && c.tipo      !== tipo)      return false
    if (estado    && c.estado    !== estado)    return false
    if (prioridad && c.prioridad !== prioridad) return false
    if (q && ![c.circuito, c.nombreVia, c.descripcion, c.responsable]
              .some(s => s?.toLowerCase().includes(q))) return false
    return true
  })
})

const dificultadesFilt = computed(() => {
  const { search, tipo, severidad, estado } = fD.value
  const q = search.toLowerCase()
  return data.value.dificultades.filter(d => {
    if (tipo      && d.tipo      !== tipo)      return false
    if (severidad && d.severidad !== severidad) return false
    if (estado    && d.estado    !== estado)    return false
    if (q && ![d.circuito, d.nombreVia, d.descripcion, d.responsable]
              .some(s => s?.toLowerCase().includes(q))) return false
    return true
  })
})

// ── Estadísticas rápidas ──────────────────────────────────────────────────────
const statsC = computed(() => {
  const cs = data.value.compromisos
  return {
    total:       cs.length,
    pendiente:   cs.filter(c => c.estado === 'pendiente').length,
    vencido:     cs.filter(isVencido).length,
    en_proceso:  cs.filter(c => c.estado === 'en_proceso').length,
    cumplido:    cs.filter(c => c.estado === 'cumplido').length,
  }
})

const statsD = computed(() => {
  const ds = data.value.dificultades
  return {
    total:      ds.length,
    activa:     ds.filter(d => d.estado === 'activa').length,
    en_gestion: ds.filter(d => d.estado === 'en_gestion').length,
    resuelta:   ds.filter(d => d.estado === 'resuelta').length,
  }
})

// ── Modal ─────────────────────────────────────────────────────────────────────
function openAdd(kind) {
  modalKind.value = kind
  form.value = kind === 'compromiso' ? blankC() : blankD()
  editId.value = null
  modal.value = true
}

function openEdit(kind, id) {
  modalKind.value = kind
  const list = kind === 'compromiso' ? data.value.compromisos : data.value.dificultades
  form.value = { ...list.find(x => x.id === id) }
  editId.value = id
  modal.value = true
}

function confirmForm() {
  const list = modalKind.value === 'compromiso' ? data.value.compromisos : data.value.dificultades
  if (editId.value === null) {
    list.push({ ...form.value })
  } else {
    const idx = list.findIndex(x => x.id === editId.value)
    if (idx !== -1) list[idx] = { ...form.value }
  }
  modal.value = false
}

function deleteItem(kind, id) {
  if (!confirm('¿Eliminar este registro?')) return
  if (kind === 'compromiso') {
    data.value.compromisos = data.value.compromisos.filter(c => c.id !== id)
  } else {
    data.value.dificultades = data.value.dificultades.filter(d => d.id !== id)
  }
}
</script>

<template>
  <div class="cv-root">

    <!-- ── Encabezado ──────────────────────────────────────────────────────── -->
    <header class="cv-header">
      <div class="cv-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        SIMEVA — Seguimiento Interno
      </div>
      <nav class="cv-nav">
        <a href="/">Mapa</a>
        <a href="/admin">Admin</a>
        <a href="/gantt">Gantt</a>
        <a href="/reporte">Reporte</a>
      </nav>
      <div class="cv-actions">
        <span class="save-msg" :class="saveMsg.startsWith('✓') ? 'msg--ok' : 'msg--bad'">{{ saveMsg }}</span>
        <button class="btn-save" :disabled="saving || loading" @click="saveData">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          {{ saving ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="cv-loading">Cargando datos…</div>

    <div v-else class="cv-body">

      <!-- ── Tabs ─────────────────────────────────────────────────────────── -->
      <nav class="cv-tabs">
        <button class="cv-tab" :class="{ active: tab === 'compromisos' }"   @click="tab = 'compromisos'">
          Compromisos pendientes
        </button>
        <button class="cv-tab" :class="{ active: tab === 'dificultades' }"  @click="tab = 'dificultades'">
          Mapa de dificultades
        </button>
      </nav>

      <!-- ════════════════════ COMPROMISOS ════════════════════ -->
      <div v-if="tab === 'compromisos'" class="cv-panel">

        <!-- Tarjetas resumen -->
        <div class="cv-stats">
          <div class="stat-card">
            <span class="stat-val">{{ statsC.total }}</span>
            <span class="stat-lbl">Total</span>
          </div>
          <div class="stat-card stat--warn">
            <span class="stat-val">{{ statsC.pendiente }}</span>
            <span class="stat-lbl">Pendientes</span>
          </div>
          <div class="stat-card stat--danger">
            <span class="stat-val">{{ statsC.vencido }}</span>
            <span class="stat-lbl">Vencidos</span>
          </div>
          <div class="stat-card stat--info">
            <span class="stat-val">{{ statsC.en_proceso }}</span>
            <span class="stat-lbl">En proceso</span>
          </div>
          <div class="stat-card stat--ok">
            <span class="stat-val">{{ statsC.cumplido }}</span>
            <span class="stat-lbl">Cumplidos</span>
          </div>
        </div>

        <!-- Filtros -->
        <div class="cv-filters">
          <input  v-model="fC.search"    class="cv-inp" type="text"   placeholder="Buscar…" />
          <select v-model="fC.tipo"      class="cv-sel">
            <option value="">Todos los tipos</option>
            <option value="obra">Obra</option>
            <option value="interventoria">Interventoría</option>
          </select>
          <select v-model="fC.estado"    class="cv-sel">
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En proceso</option>
            <option value="cumplido">Cumplido</option>
          </select>
          <select v-model="fC.prioridad" class="cv-sel">
            <option value="">Todas las prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <button class="btn-add" @click="openAdd('compromiso')">+ Agregar</button>
        </div>

        <!-- Tabla -->
        <div class="tbl-wrap">
          <table class="cv-tbl">
            <thead>
              <tr>
                <th>Circuito / Vía</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Responsable</th>
                <th>Fecha límite</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="compromisosFilt.length === 0">
                <td colspan="8" class="td-empty">Sin registros</td>
              </tr>
              <tr v-for="c in compromisosFilt" :key="c.id" :class="{ 'row--vencido': isVencido(c) }">
                <td>
                  <div class="cell-primary">{{ c.circuito || '—' }}</div>
                  <div class="cell-sub">{{ c.nombreVia }}</div>
                </td>
                <td>
                  <span class="badge" :class="c.tipo === 'obra' ? 'badge--blue' : 'badge--purple'">
                    {{ c.tipo === 'obra' ? 'Obra' : 'Interventoría' }}
                  </span>
                </td>
                <td class="td-desc">{{ c.descripcion }}</td>
                <td>{{ c.responsable || '—' }}</td>
                <td :class="{ 'td-vencido': isVencido(c) }">
                  {{ fmtFecha(c.fechaCompromiso) }}
                  <span v-if="isVencido(c)" class="vencido-tag">VENCIDO</span>
                </td>
                <td>
                  <span class="badge"
                    :class="{
                      'badge--warn':    c.estado === 'pendiente',
                      'badge--info':    c.estado === 'en_proceso',
                      'badge--ok':      c.estado === 'cumplido',
                    }">
                    {{ { pendiente: 'Pendiente', en_proceso: 'En proceso', cumplido: 'Cumplido' }[c.estado] ?? c.estado }}
                  </span>
                </td>
                <td>
                  <span class="badge"
                    :class="{
                      'badge--danger': c.prioridad === 'alta',
                      'badge--warn':   c.prioridad === 'media',
                      'badge--ok':     c.prioridad === 'baja',
                    }">
                    {{ { alta: 'Alta', media: 'Media', baja: 'Baja' }[c.prioridad] ?? c.prioridad }}
                  </span>
                </td>
                <td class="td-actions">
                  <button class="btn-act btn-act--edit"   @click="openEdit('compromiso', c.id)" title="Editar">✎</button>
                  <button class="btn-act btn-act--ok"     @click="() => { c.estado = 'cumplido' }" title="Marcar cumplido" :disabled="c.estado === 'cumplido'">✓</button>
                  <button class="btn-act btn-act--del"    @click="deleteItem('compromiso', c.id)" title="Eliminar">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ════════════════════ DIFICULTADES ════════════════════ -->
      <div v-if="tab === 'dificultades'" class="cv-panel">

        <!-- Tarjetas resumen -->
        <div class="cv-stats">
          <div class="stat-card">
            <span class="stat-val">{{ statsD.total }}</span>
            <span class="stat-lbl">Total</span>
          </div>
          <div class="stat-card stat--danger">
            <span class="stat-val">{{ statsD.activa }}</span>
            <span class="stat-lbl">Activas</span>
          </div>
          <div class="stat-card stat--warn">
            <span class="stat-val">{{ statsD.en_gestion }}</span>
            <span class="stat-lbl">En gestión</span>
          </div>
          <div class="stat-card stat--ok">
            <span class="stat-val">{{ statsD.resuelta }}</span>
            <span class="stat-lbl">Resueltas</span>
          </div>
        </div>

        <!-- Filtros -->
        <div class="cv-filters">
          <input  v-model="fD.search"    class="cv-inp" type="text" placeholder="Buscar…" />
          <select v-model="fD.tipo"      class="cv-sel">
            <option value="">Todos los tipos</option>
            <option value="tecnica">Técnica</option>
            <option value="ambiental">Ambiental</option>
            <option value="social">Social</option>
            <option value="administrativa">Administrativa</option>
          </select>
          <select v-model="fD.severidad" class="cv-sel">
            <option value="">Todas las severidades</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
          <select v-model="fD.estado"    class="cv-sel">
            <option value="">Todos los estados</option>
            <option value="activa">Activa</option>
            <option value="en_gestion">En gestión</option>
            <option value="resuelta">Resuelta</option>
          </select>
          <button class="btn-add" @click="openAdd('dificultad')">+ Registrar</button>
        </div>

        <!-- Tabla -->
        <div class="tbl-wrap">
          <table class="cv-tbl">
            <thead>
              <tr>
                <th>Circuito / Vía</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Severidad</th>
                <th>Estado</th>
                <th>Responsable</th>
                <th>Fecha registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="dificultadesFilt.length === 0">
                <td colspan="8" class="td-empty">Sin registros</td>
              </tr>
              <tr v-for="d in dificultadesFilt" :key="d.id">
                <td>
                  <div class="cell-primary">{{ d.circuito || '—' }}</div>
                  <div class="cell-sub">{{ d.nombreVia }}</div>
                </td>
                <td>
                  <span class="badge badge--gray">
                    {{ { tecnica: 'Técnica', ambiental: 'Ambiental', social: 'Social', administrativa: 'Adm.' }[d.tipo] ?? d.tipo }}
                  </span>
                </td>
                <td class="td-desc">{{ d.descripcion }}</td>
                <td>
                  <span class="badge"
                    :class="{
                      'badge--danger': d.severidad === 'alta',
                      'badge--warn':   d.severidad === 'media',
                      'badge--ok':     d.severidad === 'baja',
                    }">
                    {{ { alta: 'Alta', media: 'Media', baja: 'Baja' }[d.severidad] ?? d.severidad }}
                  </span>
                </td>
                <td>
                  <span class="badge"
                    :class="{
                      'badge--danger': d.estado === 'activa',
                      'badge--warn':   d.estado === 'en_gestion',
                      'badge--ok':     d.estado === 'resuelta',
                    }">
                    {{ { activa: 'Activa', en_gestion: 'En gestión', resuelta: 'Resuelta' }[d.estado] ?? d.estado }}
                  </span>
                </td>
                <td>{{ d.responsable || '—' }}</td>
                <td>{{ fmtFecha(d.fechaRegistro) }}</td>
                <td class="td-actions">
                  <button class="btn-act btn-act--edit" @click="openEdit('dificultad', d.id)" title="Editar">✎</button>
                  <button class="btn-act btn-act--ok"   @click="() => { d.estado = 'resuelta' }" title="Marcar resuelta" :disabled="d.estado === 'resuelta'">✓</button>
                  <button class="btn-act btn-act--del"  @click="deleteItem('dificultad', d.id)" title="Eliminar">✕</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div><!-- /cv-body -->

    <!-- ════════════════════ MODAL ════════════════════ -->
    <div v-if="modal" class="modal-overlay" @click.self="modal = false">
      <div class="modal-box">
        <datalist id="cv-circuitos">
          <option v-for="cir in circuitos" :key="cir" :value="cir" />
        </datalist>

        <!-- ── Formulario Compromiso ─────────────────────────────────────── -->
        <template v-if="modalKind === 'compromiso'">
          <h2 class="modal-title">{{ editId ? 'Editar compromiso' : 'Nuevo compromiso' }}</h2>
          <div class="form-grid">
            <label class="form-row form-row--full">
              <span>Circuito</span>
              <input v-model="form.circuito" class="form-inp" list="cv-circuitos" placeholder="Selecciona o escribe…" />
            </label>
            <label class="form-row form-row--full">
              <span>Nombre de vía</span>
              <input v-model="form.nombreVia" class="form-inp" placeholder="Ej: El Botón - Frontino" />
            </label>
            <label class="form-row">
              <span>Tipo</span>
              <select v-model="form.tipo" class="form-inp">
                <option value="obra">Obra</option>
                <option value="interventoria">Interventoría</option>
              </select>
            </label>
            <label class="form-row">
              <span>Responsable</span>
              <input v-model="form.responsable" class="form-inp" placeholder="Nombre o empresa" />
            </label>
            <label class="form-row">
              <span>Estado</span>
              <select v-model="form.estado" class="form-inp">
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="cumplido">Cumplido</option>
              </select>
            </label>
            <label class="form-row">
              <span>Prioridad</span>
              <select v-model="form.prioridad" class="form-inp">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </label>
            <label class="form-row">
              <span>Fecha compromiso</span>
              <input v-model="form.fechaCompromiso" class="form-inp" type="date" />
            </label>
            <label class="form-row">
              <span>Fecha registro</span>
              <input v-model="form.fechaRegistro" class="form-inp" type="date" />
            </label>
            <label class="form-row form-row--full">
              <span>Descripción</span>
              <textarea v-model="form.descripcion" class="form-inp form-ta" rows="3" placeholder="Detalle del compromiso…" />
            </label>
            <label class="form-row form-row--full">
              <span>Observaciones</span>
              <textarea v-model="form.observaciones" class="form-inp form-ta" rows="2" placeholder="Notas adicionales…" />
            </label>
          </div>
        </template>

        <!-- ── Formulario Dificultad ─────────────────────────────────────── -->
        <template v-else>
          <h2 class="modal-title">{{ editId ? 'Editar dificultad' : 'Nueva dificultad' }}</h2>
          <div class="form-grid">
            <label class="form-row form-row--full">
              <span>Circuito</span>
              <input v-model="form.circuito" class="form-inp" list="cv-circuitos" placeholder="Selecciona o escribe…" />
            </label>
            <label class="form-row form-row--full">
              <span>Nombre de vía</span>
              <input v-model="form.nombreVia" class="form-inp" placeholder="Ej: El Botón - Frontino" />
            </label>
            <label class="form-row">
              <span>Tipo de dificultad</span>
              <select v-model="form.tipo" class="form-inp">
                <option value="tecnica">Técnica</option>
                <option value="ambiental">Ambiental</option>
                <option value="social">Social</option>
                <option value="administrativa">Administrativa</option>
              </select>
            </label>
            <label class="form-row">
              <span>Responsable de gestión</span>
              <input v-model="form.responsable" class="form-inp" placeholder="Nombre o entidad" />
            </label>
            <label class="form-row">
              <span>Severidad</span>
              <select v-model="form.severidad" class="form-inp">
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </label>
            <label class="form-row">
              <span>Estado</span>
              <select v-model="form.estado" class="form-inp">
                <option value="activa">Activa</option>
                <option value="en_gestion">En gestión</option>
                <option value="resuelta">Resuelta</option>
              </select>
            </label>
            <label class="form-row">
              <span>Fecha registro</span>
              <input v-model="form.fechaRegistro" class="form-inp" type="date" />
            </label>
            <label class="form-row form-row--full">
              <span>Descripción</span>
              <textarea v-model="form.descripcion" class="form-inp form-ta" rows="3" placeholder="Describe la dificultad…" />
            </label>
            <label class="form-row form-row--full">
              <span>Observaciones / Plan de gestión</span>
              <textarea v-model="form.observaciones" class="form-inp form-ta" rows="2" placeholder="Acciones tomadas o previstas…" />
            </label>
          </div>
        </template>

        <div class="modal-footer">
          <button class="btn-cancel" @click="modal = false">Cancelar</button>
          <button class="btn-confirm" @click="confirmForm">
            {{ editId ? 'Actualizar' : 'Agregar' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Base ──────────────────────────────────────────────────────────────────── */
.cv-root { min-height:100vh; background:#f3f4f6; font-family:'Prompt',sans-serif; display:flex; flex-direction:column }

/* ── Header ────────────────────────────────────────────────────────────────── */
.cv-header {
  display:flex; align-items:center; gap:16px; padding:10px 20px;
  background:linear-gradient(110deg,#052318 0%,#0b5640 55%,#1a7a56 100%);
  flex-shrink:0;
}
.cv-brand {
  display:flex; align-items:center; gap:8px;
  font-size:14px; font-weight:800; color:#fff; letter-spacing:.04em; white-space:nowrap;
}
.cv-brand svg { width:18px; height:18px }
.cv-nav { display:flex; gap:8px; margin-left:8px }
.cv-nav a {
  font-size:11px; font-weight:600; color:rgba(255,255,255,.7); text-decoration:none;
  padding:4px 10px; border-radius:5px; border:1px solid rgba(255,255,255,.2);
  transition:background .12s;
}
.cv-nav a:hover { background:rgba(255,255,255,.15); color:#fff }
.cv-actions { margin-left:auto; display:flex; align-items:center; gap:12px }
.save-msg { font-size:12px; font-weight:600 }
.msg--ok  { color:#a7f3d0 }
.msg--bad { color:#fca5a5 }
.btn-save {
  display:flex; align-items:center; gap:6px; padding:7px 14px;
  border-radius:7px; border:1.5px solid rgba(255,255,255,.4);
  background:rgba(255,255,255,.15); color:#fff;
  font-family:'Prompt',sans-serif; font-size:12px; font-weight:700; cursor:pointer;
  transition:background .14s;
}
.btn-save svg { width:14px; height:14px }
.btn-save:hover:not(:disabled) { background:rgba(255,255,255,.25) }
.btn-save:disabled { opacity:.5; cursor:default }

/* ── Loading ───────────────────────────────────────────────────────────────── */
.cv-loading { flex:1; display:flex; align-items:center; justify-content:center; font-size:13px; color:#9ca3af }

/* ── Body ──────────────────────────────────────────────────────────────────── */
.cv-body { flex:1; display:flex; flex-direction:column; padding:16px; gap:0; min-height:0 }

/* ── Tabs ──────────────────────────────────────────────────────────────────── */
.cv-tabs { display:flex; gap:2px }
.cv-tab {
  padding:8px 18px; border-radius:8px 8px 0 0; border:1px solid #e5e7eb; border-bottom:none;
  background:#fff; font-family:'Prompt',sans-serif; font-size:12px; font-weight:600;
  color:#6b7280; cursor:pointer; transition:background .12s, color .12s;
}
.cv-tab.active { background:#0b5640; color:#fff; border-color:#0b5640 }

/* ── Panel ─────────────────────────────────────────────────────────────────── */
.cv-panel {
  flex:1; background:#fff; border:1px solid #e5e7eb; border-radius:0 8px 8px 8px;
  padding:16px; display:flex; flex-direction:column; gap:12px; overflow:hidden; min-height:0;
}

/* ── Stats cards ───────────────────────────────────────────────────────────── */
.cv-stats { display:flex; gap:10px; flex-wrap:wrap }
.stat-card {
  display:flex; flex-direction:column; align-items:center; gap:2px;
  padding:10px 18px; border-radius:8px; border:1.5px solid #e5e7eb;
  background:#f9fafb; min-width:80px;
}
.stat-val { font-size:22px; font-weight:800; color:#111827 }
.stat-lbl { font-size:10px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.04em }
.stat--warn   { border-color:#fde68a; background:#fffbeb }
.stat--warn   .stat-val { color:#92400e }
.stat--danger { border-color:#fca5a5; background:#fff1f2 }
.stat--danger .stat-val { color:#b91c1c }
.stat--info   { border-color:#bfdbfe; background:#eff6ff }
.stat--info   .stat-val { color:#1e40af }
.stat--ok     { border-color:#a7f3d0; background:#f0fdf4 }
.stat--ok     .stat-val { color:#065f46 }

/* ── Filters ───────────────────────────────────────────────────────────────── */
.cv-filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center }
.cv-inp, .cv-sel {
  padding:6px 10px; border:1.5px solid #e5e7eb; border-radius:7px;
  font-family:'Prompt',sans-serif; font-size:12px; color:#374151;
  background:#fff; outline:none; transition:border-color .12s;
}
.cv-inp { min-width:160px }
.cv-sel { cursor:pointer }
.cv-inp:focus, .cv-sel:focus { border-color:#0b5640 }
.btn-add {
  margin-left:auto; padding:6px 16px; border-radius:7px;
  border:1.5px solid #0b5640; background:#f0fdf4; color:#0b5640;
  font-family:'Prompt',sans-serif; font-size:12px; font-weight:700; cursor:pointer;
  transition:background .12s;
}
.btn-add:hover { background:#dcf5e8 }

/* ── Table ─────────────────────────────────────────────────────────────────── */
.tbl-wrap {
  flex:1; overflow:auto; min-height:0; border:1px solid #e5e7eb; border-radius:7px;
  scrollbar-width:thin; scrollbar-color:#e5e7eb transparent;
}
.cv-tbl { width:100%; border-collapse:collapse }
.cv-tbl th {
  position:sticky; top:0; background:#f9fafb; padding:8px 10px;
  font-size:9.5px; font-weight:700; color:#6b7280;
  text-align:left; letter-spacing:.05em; text-transform:uppercase;
  border-bottom:2px solid #e5e7eb; white-space:nowrap;
}
.cv-tbl td { padding:7px 10px; font-size:12px; border-bottom:1px solid #f3f4f6; vertical-align:middle }
.td-empty { text-align:center; color:#9ca3af; padding:28px; font-size:12px }
.td-desc { max-width:260px; color:#374151 }
.cell-primary { font-weight:600; color:#111827; font-size:12px }
.cell-sub { font-size:10.5px; color:#6b7280; margin-top:1px }
.row--vencido { background:#fff8f8 }
.td-vencido { color:#b91c1c; font-weight:600 }
.vencido-tag {
  display:inline-block; margin-left:5px; padding:1px 5px;
  background:#fee2e2; color:#b91c1c; border-radius:4px; font-size:9px; font-weight:700;
}

/* ── Badges ────────────────────────────────────────────────────────────────── */
.badge {
  display:inline-block; padding:2px 8px; border-radius:5px;
  font-size:10px; font-weight:700; letter-spacing:.02em; white-space:nowrap;
}
.badge--blue   { background:#dbeafe; color:#1e40af }
.badge--purple { background:#ede9fe; color:#5b21b6 }
.badge--gray   { background:#f3f4f6; color:#4b5563 }
.badge--ok     { background:#d1fae5; color:#065f46 }
.badge--warn   { background:#fef3c7; color:#92400e }
.badge--info   { background:#dbeafe; color:#1e40af }
.badge--danger { background:#fee2e2; color:#b91c1c }

/* ── Actions ───────────────────────────────────────────────────────────────── */
.td-actions { display:flex; gap:5px; white-space:nowrap }
.btn-act {
  padding:3px 8px; border-radius:5px; border:none;
  font-size:12px; font-weight:700; cursor:pointer; transition:background .1s;
}
.btn-act:disabled { opacity:.4; cursor:default }
.btn-act--edit { background:#e0f2fe; color:#0369a1 }
.btn-act--edit:hover:not(:disabled) { background:#bae6fd }
.btn-act--ok   { background:#d1fae5; color:#065f46 }
.btn-act--ok:hover:not(:disabled)   { background:#a7f3d0 }
.btn-act--del  { background:#fee2e2; color:#b91c1c }
.btn-act--del:hover:not(:disabled)  { background:#fecaca }

/* ── Modal ─────────────────────────────────────────────────────────────────── */
.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.45);
  display:flex; align-items:center; justify-content:center; z-index:9999;
}
.modal-box {
  background:#fff; border-radius:12px; padding:24px; width:560px; max-width:95vw;
  max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.2);
  display:flex; flex-direction:column; gap:16px;
}
.modal-title { margin:0; font-size:15px; font-weight:800; color:#052318 }
.form-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px }
.form-row { display:flex; flex-direction:column; gap:4px; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:.04em }
.form-row--full { grid-column:1 / -1 }
.form-inp {
  padding:7px 10px; border:1.5px solid #e5e7eb; border-radius:7px;
  font-family:'Prompt',sans-serif; font-size:12px; color:#374151;
  outline:none; transition:border-color .12s; background:#fff;
}
.form-inp:focus { border-color:#0b5640 }
.form-ta { resize:vertical; min-height:60px }
.modal-footer { display:flex; justify-content:flex-end; gap:10px; padding-top:4px }
.btn-cancel {
  padding:8px 18px; border-radius:7px; border:1.5px solid #e5e7eb;
  background:#f9fafb; color:#374151;
  font-family:'Prompt',sans-serif; font-size:12px; font-weight:600; cursor:pointer;
}
.btn-cancel:hover { background:#f3f4f6 }
.btn-confirm {
  padding:8px 18px; border-radius:7px; border:none;
  background:#0b5640; color:#fff;
  font-family:'Prompt',sans-serif; font-size:12px; font-weight:700; cursor:pointer;
  transition:background .12s;
}
.btn-confirm:hover { background:#065f46 }
</style>
