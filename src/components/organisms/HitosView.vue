<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({ circuito: { type: String, default: '' } })

const norm = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

// ── Estado global ─────────────────────────────────────────────────────────────
const allHitos = ref({})
const saving   = ref(false)
const toast    = ref('')
const toastOk  = ref(true)

const cortes = computed(() => {
  const key = Object.keys(allHitos.value).find(k => norm(k) === norm(props.circuito))
  const arr  = key ? (allHitos.value[key] ?? []) : []
  return [...arr].sort((a, b) => b.fecha.localeCompare(a.fecha))
})

async function load() {
  try {
    const r = await fetch('/api/hitos')
    allHitos.value = await r.json()
  } catch {
    showToast('Error cargando hitos', false)
  }
}
onMounted(load)

async function persist() {
  saving.value = true
  try {
    const r = await fetch('/api/hitos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allHitos.value),
    })
    const j = await r.json()
    if (j.ok) showToast('Corte guardado correctamente', true)
    else showToast('Error: ' + j.error, false)
  } catch (e) {
    showToast('Error de red: ' + e.message, false)
  }
  saving.value = false
}

function showToast(msg, ok) {
  toast.value   = msg
  toastOk.value = ok
  setTimeout(() => { toast.value = '' }, 3200)
}

// ── Formulario ────────────────────────────────────────────────────────────────
const showForm  = ref(false)
const editingId = ref(null)   // null = nuevo, string = editando corte existente
const form = ref(emptyForm())

function emptyForm() {
  return {
    fecha:        new Date().toISOString().slice(0, 10),
    frentes:      [],
    ejecutadas:   [],   // [{ nombre, desc }]
    en_ejecucion: [],
    pendientes:   [],
    obs:          '',
  }
}

function startEdit(c) {
  editingId.value = c.id
  form.value = {
    fecha:        c.fecha,
    frentes:      [...(c.frentes ?? [])],
    ejecutadas:   (c.ejecutadas   ?? []).map(a => typeof a === 'string' ? { nombre: a, desc: '', fotos: [] } : { ...a, fotos: [...(a.fotos ?? [])] }),
    en_ejecucion: (c.en_ejecucion ?? []).map(a => typeof a === 'string' ? { nombre: a, desc: '', fotos: [] } : { ...a, fotos: [...(a.fotos ?? [])] }),
    pendientes:   (c.pendientes   ?? []).map(a => typeof a === 'string' ? { nombre: a, desc: '', fotos: [] } : { ...a, fotos: [...(a.fotos ?? [])] }),
    obs:          c.obs ?? '',
  }
  showForm.value = true
}

// buffers de entrada por sección
const inp = ref({
  frente:       '',
  ejecutadas:   { nombre: '', desc: '' },
  en_ejecucion: { nombre: '', desc: '' },
  pendientes:   { nombre: '', desc: '' },
})

function addFrente() {
  const v = inp.value.frente.trim()
  if (!v) return
  form.value.frentes.push(v)
  inp.value.frente = ''
}

function addAct(list) {
  const { nombre, desc } = inp.value[list]
  if (!nombre.trim()) return
  form.value[list].push({ nombre: nombre.trim(), desc: desc.trim(), fotos: [] })
  inp.value[list] = { nombre: '', desc: '' }
}

function removeFrente(i) { form.value.frentes.splice(i, 1) }
function removeAct(list, i) { form.value[list].splice(i, 1) }

function onFrenteKey(e)      { if (e.key === 'Enter') { e.preventDefault(); addFrente() } }
function onActKey(e, list)   { if (e.key === 'Enter') { e.preventDefault(); addAct(list) } }

function cancelForm() {
  showForm.value  = false
  editingId.value = null
  form.value      = emptyForm()
}

function saveCorte() {
  const cKey = Object.keys(allHitos.value).find(k => norm(k) === norm(props.circuito)) ?? props.circuito
  if (!allHitos.value[cKey]) allHitos.value[cKey] = []

  const payload = {
    fecha:        form.value.fecha,
    frentes:      [...form.value.frentes],
    ejecutadas:   form.value.ejecutadas.map(a => ({ ...a })),
    en_ejecucion: form.value.en_ejecucion.map(a => ({ ...a })),
    pendientes:   form.value.pendientes.map(a => ({ ...a })),
    obs:          form.value.obs.trim(),
  }

  if (editingId.value) {
    const idx = allHitos.value[cKey].findIndex(c => c.id === editingId.value)
    if (idx !== -1) allHitos.value[cKey][idx] = { id: editingId.value, ...payload }
  } else {
    allHitos.value[cKey].push({ id: Date.now().toString(36), ...payload })
  }

  persist()
  cancelForm()
}

function deleteCorte(id) {
  if (!confirm('¿Eliminar este corte de seguimiento?')) return
  const cKey = Object.keys(allHitos.value).find(k => norm(k) === norm(props.circuito))
  if (!cKey) return
  allHitos.value[cKey] = allHitos.value[cKey].filter(c => c.id !== id)
  persist()
}

// compatibilidad con registros viejos (string) o nuevos ({ nombre, desc })
function actNombre(a) { return typeof a === 'string' ? a : a.nombre }
function actDesc(a)   { return typeof a === 'string' ? '' : a.desc }

function fmtFecha(iso) {
  const [y, m, d] = iso.split('-')
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${+d} ${M[+m - 1]} ${y}`
}

// ── Fotos por actividad ───────────────────────────────────────────────────────
const uploading = ref(false)

async function uploadFoto(file) {
  const res = await fetch('/api/actividad-foto', {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'image/jpeg' },
    body: file,
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.error)
  return data.url   // '/images/actividades/uuid.jpg'
}

async function addFotoToAct(list, idx, event) {
  const file = event.target.files[0]
  event.target.value = ''
  if (!file) return
  uploading.value = true
  try {
    const url = await uploadFoto(file)
    if (!form.value[list][idx].fotos) form.value[list][idx].fotos = []
    form.value[list][idx].fotos.push(url)
  } catch (e) {
    showToast('Error subiendo foto: ' + e.message, false)
  } finally {
    uploading.value = false
  }
}

function removeFotoFromAct(list, actIdx, fotoIdx) {
  form.value[list][actIdx].fotos.splice(fotoIdx, 1)
}

// Lightbox (lee directamente desde a.fotos del JSON)
const lbFotos  = ref([])
const lbNombre = ref('')
const lbIdx    = ref(0)

function openLb(nombre, fotos, startIdx = 0) {
  lbNombre.value = nombre
  lbFotos.value  = fotos ?? []
  lbIdx.value    = startIdx
}
function closeLb() { lbNombre.value = ''; lbFotos.value = [] }
function prevLb()  { lbIdx.value = (lbIdx.value - 1 + lbFotos.value.length) % lbFotos.value.length }
function nextLb()  { lbIdx.value = (lbIdx.value + 1) % lbFotos.value.length }
function onLbKey(e) {
  if (e.key === 'Escape')     closeLb()
  if (e.key === 'ArrowLeft')  prevLb()
  if (e.key === 'ArrowRight') nextLb()
}
</script>

<template>
  <div class="hv-root">

    <!-- Toast -->
    <Transition name="toast-anim">
      <div v-if="toast" class="hv-toast" :class="{ 'hv-toast--err': !toastOk }">
        <svg v-if="toastOk" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ toast }}
      </div>
    </Transition>

    <!-- ── Barra superior ── -->
    <div class="hv-topbar">
      <div class="hv-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        Seguimiento de campo
        <span v-if="cortes.length" class="hv-count">{{ cortes.length }}</span>
      </div>
      <button v-if="!showForm" class="hv-btn-new" @click="showForm = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nuevo corte
      </button>
    </div>

    <!-- ── Formulario nuevo corte ── -->
    <div v-if="showForm" class="hv-form-card">

      <!-- Cabecera fija del formulario -->
      <div class="hv-form-header">
        <div class="hv-form-header-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>{{ editingId ? 'Editar corte de seguimiento' : 'Nuevo corte de seguimiento' }}</span>
        </div>
        <div class="hv-form-header-right">
          <label class="hv-fecha-label">Fecha del corte</label>
          <input type="date" v-model="form.fecha" class="hv-input-date" />
          <button class="hv-btn-cancel" @click="cancelForm">Cancelar</button>
          <button class="hv-btn-save" @click="saveCorte" :disabled="saving">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            {{ saving ? 'Guardando…' : 'Guardar corte' }}
          </button>
        </div>
      </div>

      <!-- Cuerpo scrollable del formulario -->
      <div class="hv-form-body">

        <!-- Frentes -->
        <div class="hv-section">
          <div class="hv-sec-header hv-sec-header--frente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
            Frentes activos
          </div>
          <div class="hv-chips">
            <span v-for="(f, i) in form.frentes" :key="i" class="hv-chip hv-chip--frente">
              {{ f }}
              <button class="hv-chip-del" @click="removeFrente(i)">×</button>
            </span>
          </div>
          <div class="hv-add-simple">
            <input
              v-model="inp.frente"
              class="hv-input"
              placeholder="Ej: Frente 1 – km 0+000 a 2+500"
              @keydown="onFrenteKey"
            />
            <button class="hv-btn-add hv-btn-add--frente" @click="addFrente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar
            </button>
          </div>
        </div>

        <!-- Actividades ejecutadas -->
        <div class="hv-section">
          <div class="hv-sec-header hv-sec-header--ejec">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Actividades ejecutadas
          </div>
          <div class="hv-act-list">
            <div v-for="(a, i) in form.ejecutadas" :key="i" class="hv-act-item hv-act-item--ejec">
              <div class="hv-act-texts">
                <span class="hv-act-nombre">{{ a.nombre }}</span>
                <span v-if="a.desc" class="hv-act-desc">{{ a.desc }}</span>
                <div v-if="a.fotos?.length" class="hv-act-foto-row">
                  <div v-for="(url, fi) in a.fotos" :key="fi" class="hv-act-foto-wrap">
                    <img :src="url" class="hv-act-foto-thumb" :alt="`Foto ${fi+1}`" @click="openLb(a.nombre, a.fotos, fi)" />
                    <button class="hv-act-foto-rm" @click.stop="removeFotoFromAct('ejecutadas', i, fi)" title="Quitar foto">×</button>
                  </div>
                </div>
              </div>
              <div class="hv-act-side">
                <label class="hv-act-cam" :class="{ 'hv-act-cam--busy': uploading }" title="Agregar foto">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <input type="file" accept="image/*" class="hv-file-hidden" @change="addFotoToAct('ejecutadas', i, $event)" :disabled="uploading" />
                </label>
                <button class="hv-act-del" @click="removeAct('ejecutadas', i)">×</button>
              </div>
            </div>
          </div>
          <div class="hv-act-inputs">
            <input v-model="inp.ejecutadas.nombre" class="hv-input" placeholder="Actividad (ej: Excavación de cunetas)" @keydown="onActKey($event, 'ejecutadas')" />
            <input v-model="inp.ejecutadas.desc"   class="hv-input hv-input--desc" placeholder="Descripción / ubicación (ej: km 0+200 – 1+000)" @keydown="onActKey($event, 'ejecutadas')" />
            <button class="hv-btn-add hv-btn-add--ejec" @click="addAct('ejecutadas')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar
            </button>
          </div>
        </div>

        <!-- En ejecución -->
        <div class="hv-section">
          <div class="hv-sec-header hv-sec-header--prog">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            En ejecución
          </div>
          <div class="hv-act-list">
            <div v-for="(a, i) in form.en_ejecucion" :key="i" class="hv-act-item hv-act-item--prog">
              <div class="hv-act-texts">
                <span class="hv-act-nombre">{{ a.nombre }}</span>
                <span v-if="a.desc" class="hv-act-desc">{{ a.desc }}</span>
                <div v-if="a.fotos?.length" class="hv-act-foto-row">
                  <div v-for="(url, fi) in a.fotos" :key="fi" class="hv-act-foto-wrap">
                    <img :src="url" class="hv-act-foto-thumb" :alt="`Foto ${fi+1}`" @click="openLb(a.nombre, a.fotos, fi)" />
                    <button class="hv-act-foto-rm" @click.stop="removeFotoFromAct('en_ejecucion', i, fi)" title="Quitar foto">×</button>
                  </div>
                </div>
              </div>
              <div class="hv-act-side">
                <label class="hv-act-cam" :class="{ 'hv-act-cam--busy': uploading }" title="Agregar foto">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <input type="file" accept="image/*" class="hv-file-hidden" @change="addFotoToAct('en_ejecucion', i, $event)" :disabled="uploading" />
                </label>
                <button class="hv-act-del" @click="removeAct('en_ejecucion', i)">×</button>
              </div>
            </div>
          </div>
          <div class="hv-act-inputs">
            <input v-model="inp.en_ejecucion.nombre" class="hv-input" placeholder="Actividad (ej: Colocación base granular)" @keydown="onActKey($event, 'en_ejecucion')" />
            <input v-model="inp.en_ejecucion.desc"   class="hv-input hv-input--desc" placeholder="Descripción / ubicación (ej: km 1+000 – 1+500)" @keydown="onActKey($event, 'en_ejecucion')" />
            <button class="hv-btn-add hv-btn-add--prog" @click="addAct('en_ejecucion')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar
            </button>
          </div>
        </div>

        <!-- Pendiente / Planeado -->
        <div class="hv-section">
          <div class="hv-sec-header hv-sec-header--pend">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Pendiente / Planeado
          </div>
          <div class="hv-act-list">
            <div v-for="(a, i) in form.pendientes" :key="i" class="hv-act-item hv-act-item--pend">
              <div class="hv-act-texts">
                <span class="hv-act-nombre">{{ a.nombre }}</span>
                <span v-if="a.desc" class="hv-act-desc">{{ a.desc }}</span>
                <div v-if="a.fotos?.length" class="hv-act-foto-row">
                  <div v-for="(url, fi) in a.fotos" :key="fi" class="hv-act-foto-wrap">
                    <img :src="url" class="hv-act-foto-thumb" :alt="`Foto ${fi+1}`" @click="openLb(a.nombre, a.fotos, fi)" />
                    <button class="hv-act-foto-rm" @click.stop="removeFotoFromAct('pendientes', i, fi)" title="Quitar foto">×</button>
                  </div>
                </div>
              </div>
              <div class="hv-act-side">
                <label class="hv-act-cam" :class="{ 'hv-act-cam--busy': uploading }" title="Agregar foto">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <input type="file" accept="image/*" class="hv-file-hidden" @change="addFotoToAct('pendientes', i, $event)" :disabled="uploading" />
                </label>
                <button class="hv-act-del" @click="removeAct('pendientes', i)">×</button>
              </div>
            </div>
          </div>
          <div class="hv-act-inputs">
            <input v-model="inp.pendientes.nombre" class="hv-input" placeholder="Actividad (ej: Doble riego)" @keydown="onActKey($event, 'pendientes')" />
            <input v-model="inp.pendientes.desc"   class="hv-input hv-input--desc" placeholder="Descripción / ubicación (ej: Frente 1 completo)" @keydown="onActKey($event, 'pendientes')" />
            <button class="hv-btn-add hv-btn-add--pend" @click="addAct('pendientes')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Agregar
            </button>
          </div>
        </div>

        <!-- Observaciones -->
        <div class="hv-section hv-section--last">
          <div class="hv-sec-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
            Observaciones generales
          </div>
          <textarea v-model="form.obs" class="hv-textarea" rows="3" placeholder="Clima, equipos disponibles, personal, incidentes, novedades…" />
        </div>

      </div>
    </div>

    <!-- ── Empty state ── -->
    <div v-if="cortes.length === 0 && !showForm" class="hv-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
      <p>Sin cortes de seguimiento registrados.</p>
      <p>Haz clic en <strong>Nuevo corte</strong> para empezar.</p>
    </div>

    <!-- ── Timeline ── -->
    <div class="hv-timeline">
      <div v-for="c in cortes" :key="c.id" class="hv-card">

        <!-- Cabecera -->
        <div class="hv-card-head">
          <div class="hv-card-fecha">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Corte · {{ fmtFecha(c.fecha) }}
          </div>
          <div class="hv-frentes-row">
            <span v-for="(f, i) in c.frentes" :key="i" class="hv-badge-frente">{{ f }}</span>
            <span v-if="!c.frentes?.length" class="hv-badge-frente hv-badge-frente--empty">Sin frentes registrados</span>
          </div>
          <div class="hv-card-actions">
            <button class="hv-btn-edit" @click="startEdit(c)" title="Editar corte">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="hv-btn-del" @click="deleteCorte(c.id)" title="Eliminar corte">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>

        <!-- Columnas de actividades -->
        <div class="hv-card-body">

          <div class="hv-col hv-col--ejec">
            <p class="hv-col-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              Ejecutado
            </p>
            <ul v-if="c.ejecutadas?.length">
              <li v-for="(a, i) in c.ejecutadas" :key="i" class="hv-li-row">
                <div class="hv-li-text">
                  <span class="li-nombre">{{ actNombre(a) }}</span>
                  <span v-if="actDesc(a)" class="li-desc">{{ actDesc(a) }}</span>
                </div>
                <button v-if="a.fotos?.length" class="hv-photo-btn" @click.stop="openLb(actNombre(a), a.fotos)" title="Ver fotos">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span class="hv-photo-count">{{ a.fotos.length }}</span>
                </button>
              </li>
            </ul>
            <span v-else class="hv-col-empty">Sin actividades registradas</span>
          </div>

          <div class="hv-col hv-col--prog">
            <p class="hv-col-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              En ejecución
            </p>
            <ul v-if="c.en_ejecucion?.length">
              <li v-for="(a, i) in c.en_ejecucion" :key="i" class="hv-li-row">
                <div class="hv-li-text">
                  <span class="li-nombre">{{ actNombre(a) }}</span>
                  <span v-if="actDesc(a)" class="li-desc">{{ actDesc(a) }}</span>
                </div>
                <button v-if="a.fotos?.length" class="hv-photo-btn" @click.stop="openLb(actNombre(a), a.fotos)" title="Ver fotos">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span class="hv-photo-count">{{ a.fotos.length }}</span>
                </button>
              </li>
            </ul>
            <span v-else class="hv-col-empty">Sin actividades registradas</span>
          </div>

          <div class="hv-col hv-col--pend">
            <p class="hv-col-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Pendiente / Planeado
            </p>
            <ul v-if="c.pendientes?.length">
              <li v-for="(a, i) in c.pendientes" :key="i" class="hv-li-row">
                <div class="hv-li-text">
                  <span class="li-nombre">{{ actNombre(a) }}</span>
                  <span v-if="actDesc(a)" class="li-desc">{{ actDesc(a) }}</span>
                </div>
                <button v-if="a.fotos?.length" class="hv-photo-btn" @click.stop="openLb(actNombre(a), a.fotos)" title="Ver fotos">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span class="hv-photo-count">{{ a.fotos.length }}</span>
                </button>
              </li>
            </ul>
            <span v-else class="hv-col-empty">Sin actividades registradas</span>
          </div>

        </div>

        <!-- Observaciones -->
        <div v-if="c.obs" class="hv-obs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          {{ c.obs }}
        </div>

      </div>
    </div>

  </div>

  <!-- ── Lightbox de fotos de actividad ── -->
  <Teleport to="body">
    <div v-if="lbNombre" class="hv-lb-overlay" @click.self="closeLb" @keydown="onLbKey" tabindex="-1">
      <div class="hv-lb-box">

        <div class="hv-lb-header">
          <div class="hv-lb-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            {{ lbNombre }}
          </div>
          <button class="hv-lb-close" @click="closeLb">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="hv-lb-main">
          <button class="hv-lb-nav hv-lb-nav--prev" @click="prevLb" :disabled="lbFotos.length <= 1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <img :src="lbFotos[lbIdx]" class="hv-lb-img" :alt="lbNombre" />
          <button class="hv-lb-nav hv-lb-nav--next" @click="nextLb" :disabled="lbFotos.length <= 1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div class="hv-lb-counter">{{ lbIdx + 1 }} / {{ lbFotos.length }}</div>

        <div v-if="lbFotos.length > 1" class="hv-lb-thumbs">
          <img
            v-for="(url, i) in lbFotos"
            :key="url"
            :src="url"
            class="hv-lb-thumb"
            :class="{ 'hv-lb-thumb--active': i === lbIdx }"
            @click="lbIdx = i"
            :alt="`Foto ${i + 1}`"
          />
        </div>

      </div>
    </div>
  </Teleport>

</template>

<style scoped>
/* ── Raíz ── */
.hv-root {
  padding: 18px 22px 24px;
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #f5f7f6;
  font-family: inherit;
}

/* ── Toast ── */
.hv-toast {
  position: fixed;
  top: 18px;
  right: 22px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #145c3e;
  color: #fff;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(0,0,0,.22);
}
.hv-toast svg { width: 15px; height: 15px; flex-shrink: 0; }
.hv-toast--err { background: #b91c1c; }
.toast-anim-enter-active, .toast-anim-leave-active { transition: opacity .2s, transform .2s; }
.toast-anim-enter-from, .toast-anim-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Barra superior ── */
.hv-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.hv-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 700;
  color: #0a4d38;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.hv-title svg { width: 15px; height: 15px; }
.hv-count {
  background: #0a4d38;
  color: #fff;
  border-radius: 20px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 700;
}
.hv-btn-new {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #0a4d38;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s, box-shadow .15s;
  box-shadow: 0 2px 8px rgba(10,77,56,.3);
}
.hv-btn-new:hover { background: #0d6347; box-shadow: 0 4px 12px rgba(10,77,56,.4); }
.hv-btn-new svg { width: 13px; height: 13px; }

/* ── Tarjeta formulario ── */
.hv-form-card {
  background: #fff;
  border: 2px solid #0a4d38;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(10,77,56,.15);
  flex-shrink: 0;
}

/* Cabecera FIJA del formulario */
.hv-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  background: linear-gradient(90deg, #0a4d38 0%, #0d6347 100%);
  flex-wrap: wrap;
}
.hv-form-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .04em;
}
.hv-form-header-left svg { width: 15px; height: 15px; opacity: .8; }
.hv-form-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.hv-fecha-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,.75);
  text-transform: uppercase;
  letter-spacing: .04em;
}
.hv-input-date {
  background: rgba(255,255,255,.15);
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 7px;
  padding: 6px 11px;
  font-size: 13px;
  color: #fff;
  outline: none;
  cursor: pointer;
}
.hv-input-date:focus { border-color: rgba(255,255,255,.7); background: rgba(255,255,255,.25); }

.hv-btn-cancel {
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.3);
  color: #fff;
  border-radius: 7px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.hv-btn-cancel:hover { background: rgba(255,255,255,.22); }

.hv-btn-save {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: #0a4d38;
  border: none;
  border-radius: 7px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background .15s, box-shadow .15s;
  box-shadow: 0 2px 6px rgba(0,0,0,.15);
}
.hv-btn-save:hover:not(:disabled) { background: #e8f5ee; box-shadow: 0 3px 10px rgba(0,0,0,.2); }
.hv-btn-save:disabled { opacity: .5; cursor: not-allowed; }
.hv-btn-save svg { width: 13px; height: 13px; }

/* Cuerpo del formulario */
.hv-form-body {
  padding: 6px 0 4px;
}

.hv-section {
  padding: 14px 18px;
  border-bottom: 1px solid #eef2f0;
}
.hv-section--last { border-bottom: none; }

.hv-sec-header {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: 10px;
  color: #555;
}
.hv-sec-header svg { width: 13px; height: 13px; flex-shrink: 0; }
.hv-sec-header--frente { color: #6d28d9; }
.hv-sec-header--ejec   { color: #059669; }
.hv-sec-header--prog   { color: #1d4ed8; }
.hv-sec-header--pend   { color: #c2410c; }

/* Chips (frentes) */
.hv-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.hv-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.hv-chip--frente { background: #ede9fe; color: #5b21b6; border: 1px solid #c4b5fd; }
.hv-chip-del {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  padding: 0 0 0 2px;
  color: inherit;
  opacity: .5;
}
.hv-chip-del:hover { opacity: 1; }

/* Input simple (frentes) */
.hv-add-simple {
  display: flex;
  gap: 8px;
}

/* Actividades agregadas en el formulario */
.hv-act-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}
.hv-act-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  border-left: 3px solid;
}
.hv-act-item--ejec { background: #f0fdf4; border-color: #059669; }
.hv-act-item--prog { background: #eff6ff; border-color: #1d4ed8; }
.hv-act-item--pend { background: #fff7ed; border-color: #c2410c; }

.hv-act-texts { flex: 1; min-width: 0; }
.hv-act-nombre {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hv-act-desc {
  display: block;
  font-size: 11px;
  color: #666;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.hv-act-del {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  color: #aaa;
  padding: 0 2px;
  flex-shrink: 0;
}
.hv-act-del:hover { color: #b91c1c; }

/* Inputs de actividad (2 filas + botón) */
.hv-act-inputs {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 6px 8px;
}
.hv-act-inputs .hv-input:first-child {
  grid-column: 1;
  grid-row: 1;
}
.hv-act-inputs .hv-input--desc {
  grid-column: 1;
  grid-row: 2;
}
.hv-act-inputs .hv-btn-add {
  grid-column: 2;
  grid-row: 1 / 3;
  align-self: stretch;
  white-space: nowrap;
}

/* Inputs base */
.hv-input {
  background: #ffffff;
  border: 1.5px solid #d1d5db;
  border-radius: 7px;
  padding: 8px 12px;
  font-size: 13px;
  color: #111827;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  transition: border-color .15s, box-shadow .15s;
}
.hv-input:focus {
  border-color: #0a4d38;
  box-shadow: 0 0 0 3px rgba(10,77,56,.1);
}
.hv-input--desc {
  background: #fafafa;
  font-size: 12px;
  color: #374151;
}
.hv-input::placeholder { color: #9ca3af; }

/* Botones agregar */
.hv-btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1.5px solid;
  border-radius: 7px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background .15s;
}
.hv-btn-add svg { width: 12px; height: 12px; }
.hv-btn-add--frente { background: #f5f3ff; border-color: #a78bfa; color: #5b21b6; }
.hv-btn-add--frente:hover { background: #ede9fe; }
.hv-btn-add--ejec   { background: #f0fdf4; border-color: #6ee7b7; color: #059669; }
.hv-btn-add--ejec:hover { background: #dcfce7; }
.hv-btn-add--prog   { background: #eff6ff; border-color: #93c5fd; color: #1d4ed8; }
.hv-btn-add--prog:hover { background: #dbeafe; }
.hv-btn-add--pend   { background: #fff7ed; border-color: #fdba74; color: #c2410c; }
.hv-btn-add--pend:hover { background: #ffedd5; }

/* Textarea */
.hv-textarea {
  background: #ffffff;
  border: 1.5px solid #d1d5db;
  border-radius: 7px;
  padding: 9px 12px;
  font-size: 13px;
  color: #111827;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  width: 100%;
  transition: border-color .15s, box-shadow .15s;
  font-family: inherit;
}
.hv-textarea:focus {
  border-color: #0a4d38;
  box-shadow: 0 0 0 3px rgba(10,77,56,.1);
}
.hv-textarea::placeholder { color: #9ca3af; }

/* ── Empty state ── */
.hv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 24px;
  color: #9ca3af;
  text-align: center;
  background: #fff;
  border-radius: 12px;
  border: 1.5px dashed #d1d5db;
}
.hv-empty svg { width: 44px; height: 44px; opacity: .3; }
.hv-empty p { font-size: 13px; margin: 0; line-height: 1.5; }
.hv-empty strong { color: #0a4d38; }

/* ── Timeline ── */
.hv-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hv-card {
  background: #fff;
  border: 1px solid #e2e8e4;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0,0,0,.06);
}

.hv-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  background: #f8faf9;
  border-bottom: 1px solid #e2e8e4;
  flex-wrap: wrap;
}
.hv-card-fecha {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #0a4d38;
  flex-shrink: 0;
  white-space: nowrap;
}
.hv-card-fecha svg { width: 14px; height: 14px; }

.hv-frentes-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  flex: 1;
}
.hv-badge-frente {
  background: #ede9fe;
  color: #5b21b6;
  border-radius: 20px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid #c4b5fd;
}
.hv-badge-frente--empty { background: #f3f4f6; color: #9ca3af; border-color: #e5e7eb; font-style: italic; }

.hv-card-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}
.hv-btn-edit {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 5px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  transition: color .15s, background .15s;
}
.hv-btn-edit:hover { color: #1d4ed8; background: #eff6ff; }
.hv-btn-edit svg { width: 15px; height: 15px; }

.hv-btn-del {
  background: none;
  border: none;
  cursor: pointer;
  color: #d1d5db;
  padding: 5px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  transition: color .15s, background .15s;
}
.hv-btn-del:hover { color: #dc2626; background: #fef2f2; }
.hv-btn-del svg { width: 15px; height: 15px; }

/* Columnas */
.hv-card-body {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

.hv-col {
  padding: 14px 16px;
  border-right: 1px solid #f0f0f0;
}
.hv-col:last-child { border-right: none; }

.hv-col-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .07em;
  margin-bottom: 10px;
}
.hv-col-title svg { width: 12px; height: 12px; flex-shrink: 0; }
.hv-col--ejec .hv-col-title { color: #059669; }
.hv-col--prog .hv-col-title { color: #1d4ed8; }
.hv-col--pend .hv-col-title { color: #c2410c; }

.hv-col ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hv-col li {
  padding-left: 10px;
  position: relative;
}
.hv-col--ejec li::before { content: ''; position: absolute; left: 0; top: 7px; width: 4px; height: 4px; border-radius: 50%; background: #059669; }
.hv-col--prog li::before { content: ''; position: absolute; left: 0; top: 7px; width: 4px; height: 4px; border-radius: 50%; background: #1d4ed8; }
.hv-col--pend li::before { content: ''; position: absolute; left: 0; top: 7px; width: 4px; height: 4px; border-radius: 50%; background: #c2410c; }

.li-nombre {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #111827;
  line-height: 1.4;
}
.li-desc {
  display: block;
  font-size: 11px;
  color: #6b7280;
  margin-top: 1px;
  line-height: 1.3;
}
.hv-col-empty {
  font-size: 11px;
  color: #d1d5db;
  font-style: italic;
}

/* Observaciones */
.hv-obs {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 16px;
  background: #fffbeb;
  border-top: 1px solid #fde68a;
  font-size: 12px;
  color: #78350f;
  line-height: 1.5;
}
.hv-obs svg { width: 13px; height: 13px; flex-shrink: 0; margin-top: 1px; color: #d97706; }

@media (max-width: 680px) {
  .hv-card-body { grid-template-columns: 1fr; }
  .hv-col { border-right: none; border-bottom: 1px solid #f0f0f0; }
  .hv-col:last-child { border-bottom: none; }
  .hv-act-inputs { grid-template-columns: 1fr; grid-template-rows: auto auto auto; }
  .hv-act-inputs .hv-btn-add { grid-column: 1; grid-row: 3; width: 100%; }
}

/* ── Fila de actividad con botón de fotos (timeline) ── */
.hv-li-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.hv-li-text { flex: 1; min-width: 0; }
.hv-photo-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 2px 5px 2px 3px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 700;
  transition: color .15s, background .15s;
  margin-top: 1px;
  border: 1px solid transparent;
}
.hv-photo-btn:hover { color: #0a4d38; background: #e6f4ee; border-color: #a7d4c0; }
.hv-photo-btn svg { width: 12px; height: 12px; }
.hv-photo-count { color: inherit; }

/* ── Botón cámara + miniaturas en formulario ── */
.hv-act-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f9fafb;
  border: 1px solid #f0f0f0;
}
.hv-act-texts { flex: 1; min-width: 0; }
.hv-act-side {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.hv-act-cam {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  cursor: pointer;
  color: #9ca3af;
  background: none;
  transition: color .15s, background .15s;
}
.hv-act-cam:hover { color: #0a4d38; background: #e6f4ee; }
.hv-act-cam--busy { opacity: .5; pointer-events: none; }
.hv-act-cam svg { width: 14px; height: 14px; display: block; }
.hv-file-hidden { display: none; }

/* Miniaturas de fotos adjuntas (formulario) */
.hv-act-foto-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.hv-act-foto-wrap {
  position: relative;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
}
.hv-act-foto-thumb {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  transition: opacity .15s;
}
.hv-act-foto-thumb:hover { opacity: .85; }
.hv-act-foto-rm {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #dc2626;
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,.25);
}

/* ── Lightbox overlay ── */
.hv-lb-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.72);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.hv-lb-box {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,.5);
}
.hv-lb-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}
.hv-lb-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #0a4d38;
}
.hv-lb-title svg { width: 16px; height: 16px; }
.hv-lb-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  transition: color .15s, background .15s;
}
.hv-lb-close:hover { color: #111; background: #f3f4f6; }
.hv-lb-close svg { width: 18px; height: 18px; }

.hv-lb-loading {
  padding: 40px;
  text-align: center;
  color: #6b7280;
  font-size: 13px;
}
.hv-lb-empty {
  padding: 40px 24px;
  text-align: center;
  color: #9ca3af;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.hv-lb-empty svg { width: 40px; height: 40px; color: #d1d5db; }
.hv-lb-empty p { font-size: 13px; margin: 0; }
.hv-lb-empty small { font-size: 11px; color: #c0c6cc; word-break: break-all; }
.hv-lb-empty code { background: #f3f4f6; padding: 2px 5px; border-radius: 4px; font-family: monospace; }

/* Imagen principal con navegación */
.hv-lb-main {
  position: relative;
  flex: 1;
  min-height: 0;
  background: #111;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.hv-lb-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}
.hv-lb-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,.15);
  border: none;
  cursor: pointer;
  color: #fff;
  padding: 12px 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  transition: background .15s;
  backdrop-filter: blur(4px);
}
.hv-lb-nav:hover:not(:disabled) { background: rgba(255,255,255,.3); }
.hv-lb-nav:disabled { opacity: .3; cursor: default; }
.hv-lb-nav svg { width: 20px; height: 20px; }
.hv-lb-nav--prev { left: 12px; }
.hv-lb-nav--next { right: 12px; }

.hv-lb-counter {
  text-align: center;
  font-size: 11px;
  color: #9ca3af;
  padding: 6px 0 4px;
  flex-shrink: 0;
}

/* Miniaturas */
.hv-lb-thumbs {
  display: flex;
  gap: 6px;
  padding: 8px 14px 12px;
  overflow-x: auto;
  flex-shrink: 0;
  border-top: 1px solid #f0f0f0;
}
.hv-lb-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  flex-shrink: 0;
  transition: border-color .15s, opacity .15s;
  opacity: .65;
}
.hv-lb-thumb:hover { opacity: 1; }
.hv-lb-thumb--active { border-color: #0a4d38; opacity: 1; }
</style>
