<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAdminAuth } from '../composables/useAdminAuth.js'

const logoSrc = '/images/escudo.png'
const { isAuthed, userName, userEmail, authErr, loading: authLoading, initAuth, login, logout, authHeaders } = useAdminAuth()

// ── Entorno ───────────────────────────────────────────────────────────────────
const ADMIN_API = import.meta.env.VITE_ADMIN_API ?? ''
const isProd    = !!ADMIN_API
const LOCAL_API = '/api/localizacion'
const GEO_FILE  = import.meta.env.VITE_API_LOCALIZACIONES ?? '/data/localizacion.geojson'

// ── Estado principal ──────────────────────────────────────────────────────────
const rawGeoJson   = ref(null)
const features     = ref([])
const loading      = ref(true)
const saving       = ref(false)
const toastMsg     = ref('')
const toastType    = ref('ok')
const search       = ref('')
const filterCir    = ref('')
const pending      = ref(new Set())
const originals    = ref({})
const confirmModal = ref(null)
const activeSubregion = ref(null)
const editModal    = ref(null)
const dFis         = ref(0)
const dFin         = ref(0)
const dEst         = ref(0)
const loginErr     = ref('')

// ── Estado imágenes ───────────────────────────────────────────────────────────
const TIPOS_FOTO   = ['antes', 'durante', 'despues']
const TIPO_LABEL   = { antes: 'Antes', durante: 'Durante', despues: 'Después' }
const imageModal   = ref(null)   // { feat }
const imagesTipo   = ref('antes')
const photosData   = ref({})     // cir → { antes:[], durante:[], despues:[] }
const selectedFiles = ref([])
const uploading    = ref(false)
const previewUrl   = ref(null)
const fileInputRef = ref(null)

// ── Auth ──────────────────────────────────────────────────────────────────────
const MSAL_MSGS = {
  user_cancelled:          null,
  interaction_in_progress: 'Hay un inicio de sesión en curso. Recarga la página e intenta de nuevo.',
}
function authErrMsg(e) {
  const code = e?.errorCode ?? ''
  if (code in MSAL_MSGS) return MSAL_MSGS[code]
  return 'No se pudo iniciar sesión. Si el problema persiste, contacta al administrador.'
}
async function doLogin() {
  loginErr.value = ''
  try { await login() } catch (e) {
    const msg = authErrMsg(e)
    if (msg) loginErr.value = msg
  }
}
async function doLogout() {
  await logout()
  features.value = []
  rawGeoJson.value = null
}

// ── Carga ─────────────────────────────────────────────────────────────────────
function captureOriginals() {
  const o = {}
  features.value.forEach(f => { o[f._i] = { fis: f.fis, fin: f.fin, est: f.est } })
  originals.value = o
}

async function load() {
  if (isProd && !isAuthed.value) return
  loading.value = true
  try {
    if (isProd) { await loadProd() } else { await loadLocal() }
    captureOriginals()
  } catch (e) {
    toast('Error al cargar los datos.', 'err')
  }
  loading.value = false
}

async function loadLocal() {
  const r = await fetch(GEO_FILE)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  rawGeoJson.value = await r.json()
  features.value = rawGeoJson.value.features.map((f, i) => ({
    _i:   i,
    id:   f.properties.id         ?? (i + 1),
    name: f.properties.name       ?? f.properties.NOMBRE_VIA ?? '',
    cir:  f.properties.CIRCUITO   ?? '',
    via:  f.properties.NOMBRE_VIA ?? '',
    mpio: f.properties.MPIO_NOMBR ?? '',
    sub:  f.properties.SUBREGION  ?? '',
    lkm:  f.properties.Long_km    ?? 0,
    fis:  +(f.properties.AV_FISICO  * 100).toFixed(2),
    fin:  +(f.properties.AV_FINAN   * 100).toFixed(2),
    est:  f.properties.ESTABILIZADO ?? 0,
  }))
}

async function loadProd() {
  const geoUrl = import.meta.env.VITE_API_LOCALIZACIONES
  const [geoRes, circRes] = await Promise.all([
    fetch(geoUrl),
    fetch(`${ADMIN_API}/circuits`, { headers: await authHeaders() }),
  ])
  if (!geoRes.ok)  throw new Error(`GeoJSON HTTP ${geoRes.status}`)
  if (!circRes.ok) throw new Error(`Circuits API HTTP ${circRes.status}`)

  const geoJson = await geoRes.json()
  const { circuits } = await circRes.json()
  // partitionKey = NOMBRE_VIA (nombre del circuito), no un id numérico
  const progIdx = {}
  for (const c of (circuits ?? [])) progIdx[c.partitionKey] = c

  rawGeoJson.value = geoJson.data?.type === 'FeatureCollection' ? geoJson.data : geoJson
  features.value = rawGeoJson.value.features.map((f, i) => {
    const name   = f.properties.name ?? f.properties.NOMBRE_VIA ?? ''
    const featId = f.properties.id   ?? (i + 1)
    const prog   = progIdx[name]   // buscar por NOMBRE_VIA, que es el partitionKey
    return {
      _i:   i,
      id:   featId,
      name,
      cir:  f.properties.CIRCUITO   ?? '',
      via:  f.properties.NOMBRE_VIA ?? '',
      mpio: f.properties.MPIO_NOMBR ?? '',
      sub:  f.properties.SUBREGION  ?? '',
      lkm:  f.properties.Long_km    ?? 0,
      // circuits API devuelve AV_FISICO en porcentaje (0-100); GeoJSON en decimal (0-1)
      fis:  prog ? +prog.AV_FISICO.toFixed(2) : +(f.properties.AV_FISICO * 100).toFixed(2),
      fin:  prog ? +prog.AV_FINAN.toFixed(2)  : +(f.properties.AV_FINAN  * 100).toFixed(2),
      est:  prog ? prog.ESTABILIZADO           : (f.properties.ESTABILIZADO ?? 0),
    }
  })
}

onMounted(async () => { await initAuth(); load() })

// ── Subregiones ───────────────────────────────────────────────────────────────
const subregiones = computed(() => [...new Set(features.value.map(f => f.sub))].sort())

const subregionStats = computed(() => {
  const map = {}
  for (const sub of subregiones.value) {
    const group = features.value.filter(f => f.sub === sub)
    const count    = group.length
    const totalKm  = +group.reduce((s, f) => s + (f.lkm || 0), 0).toFixed(1)
    const totalEst = +group.reduce((s, f) => s + (f.est || 0), 0).toFixed(1)
    const avgFis   = count ? +(group.reduce((s, f) => s + f.fis, 0) / count).toFixed(1) : 0
    const avgFin   = count ? +(group.reduce((s, f) => s + f.fin, 0) / count).toFixed(1) : 0
    const pendingCount = group.filter(f => pending.value.has(f._i)).length
    map[sub] = { count, totalKm, totalEst, avgFis, avgFin, pendingCount }
  }
  return map
})

function selectSubregion(sub) { activeSubregion.value = sub; search.value = ''; filterCir.value = '' }
function backToSubregions()   { activeSubregion.value = null; search.value = ''; filterCir.value = '' }

// ── Tabla ─────────────────────────────────────────────────────────────────────
const circuitos = computed(() => {
  if (!activeSubregion.value) return []
  return [...new Set(features.value.filter(f => f.sub === activeSubregion.value).map(f => f.cir))].sort()
})

const tableRows = computed(() => {
  if (!activeSubregion.value) return []
  const q = search.value.toLowerCase()
  return features.value.filter(f => {
    if (f.sub !== activeSubregion.value) return false
    if (filterCir.value && f.cir !== filterCir.value) return false
    if (q && !f.cir.toLowerCase().includes(q) && !f.via.toLowerCase().includes(q) && !f.mpio.toLowerCase().includes(q)) return false
    return true
  })
})

function clearTableFilters() { search.value = ''; filterCir.value = '' }

// ── Modal edición ─────────────────────────────────────────────────────────────
function openEditModal(f) { editModal.value = f; dFis.value = f.fis; dFin.value = f.fin; dEst.value = f.est }
function closeEditModal()  { editModal.value = null }

function applyEdit() {
  if (!editModal.value) return
  editModal.value.fis = +Number(dFis.value).toFixed(2)
  editModal.value.fin = +Number(dFin.value).toFixed(2)
  editModal.value.est = +Number(dEst.value).toFixed(2)
  pending.value = new Set(pending.value.add(editModal.value._i))
  closeEditModal()
}

const editErrs = computed(() => {
  const e = []
  if (dFis.value < 0 || dFis.value > 100) e.push('Av. Físico debe estar entre 0 y 100%')
  if (dFin.value < 0 || dFin.value > 100) e.push('Av. Financiero debe estar entre 0 y 100%')
  if (editModal.value?.lkm > 0 && dEst.value > editModal.value.lkm) e.push(`Estabilizado no puede superar ${editModal.value.lkm} km`)
  return e
})

// ── Validación ────────────────────────────────────────────────────────────────
function errs(f) {
  const e = []
  if (f.fis < 0 || f.fis > 100) e.push('Av. Físico 0–100%')
  if (f.fin < 0 || f.fin > 100) e.push('Av. Financiero 0–100%')
  if (f.lkm > 0 && f.est > f.lkm) e.push(`Estabilizado ≤ ${f.lkm} km`)
  return e
}
const anyError  = computed(() => features.value.some(f => pending.value.has(f._i) && errs(f).length))
const totalPend = computed(() => pending.value.size)

// ── Confirmación y guardado ───────────────────────────────────────────────────
function requestSave() {
  for (const f of features.value) {
    if (pending.value.has(f._i) && errs(f).length) { toast('Corrija los errores antes de guardar', 'err'); return }
  }
  const changes = []
  for (const f of features.value) {
    if (!pending.value.has(f._i)) continue
    const orig = originals.value[f._i]
    if (!orig) continue
    const diffs = []
    if (Math.abs(f.fis - orig.fis) > 0.005) diffs.push({ campo: 'Av. Físico',     antes: orig.fis + '%',   despues: f.fis + '%' })
    if (Math.abs(f.fin - orig.fin) > 0.005) diffs.push({ campo: 'Av. Financiero', antes: orig.fin + '%',   despues: f.fin + '%' })
    if (Math.abs(f.est - orig.est) > 0.005) diffs.push({ campo: 'Estabilizado',   antes: orig.est + ' km', despues: f.est + ' km' })
    if (diffs.length) changes.push({ f, diffs })
  }
  if (!changes.length) { toast('Sin cambios reales para guardar', 'err'); return }
  confirmModal.value = changes
}
function cancelConfirm() { confirmModal.value = null }

async function save() {
  confirmModal.value = null
  saving.value = true
  try {
    if (isProd) { await saveProd() } else { await saveLocal() }
  } catch (e) { toast('Error al guardar.', 'err') }
  saving.value = false
}

async function saveLocal() {
  const gj = JSON.parse(JSON.stringify(rawGeoJson.value))
  features.value.forEach(f => {
    const p = gj.features[f._i].properties
    p.AV_FISICO    = +(f.fis / 100).toFixed(6)
    p.AV_FINAN     = +(f.fin / 100).toFixed(6)
    p.ESTABILIZADO = f.est
  })
  const r = await fetch(LOCAL_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gj) })
  const ct = r.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) throw new Error('Servidor de escritura no disponible')
  const j = await r.json()
  if (!j.ok) throw new Error(j.error)
  rawGeoJson.value = gj
  pending.value = new Set()
  captureOriginals()
  toast('Guardado correctamente ✓', 'ok')
}

async function saveProd() {
  const toSave = features.value.filter(f => pending.value.has(f._i) && !errs(f).length)
  if (!toSave.length) { toast('Sin cambios válidos para guardar', 'err'); return }
  let errors = 0
  await Promise.all(toSave.map(async f => {
    const r = await fetch(`${ADMIN_API}/circuits/${encodeURIComponent(f.name)}/progress`, {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify({ progressPhysical: f.fis, progressFinancial: f.fin, kmStabilized: f.est }),
    })
    if (!r.ok) {
      if (r.status === 401) { toast('Sesión expirada — vuelve a iniciar sesión', 'err'); logout() }
      errors++
    }
  }))
  if (errors) {
    toast(`${errors} circuito(s) no se pudieron guardar`, 'err')
  } else {
    pending.value = new Set()
    captureOriginals()
    toast(`${toSave.length} circuito(s) actualizados ✓`, 'ok')
  }
}

// ── Módulo de imágenes ────────────────────────────────────────────────────────
async function openImageModal(f) {
  imageModal.value = f
  imagesTipo.value = 'antes'
  selectedFiles.value = []
  previewUrl.value = null
  if (!isProd) await loadPhotos(f.cir)
}
function closeImageModal() { imageModal.value = null; selectedFiles.value = []; previewUrl.value = null }

async function loadPhotos(cir) {
  try {
    const r = await fetch(`/api/circuito-photos/${encodeURIComponent(cir)}`)
    if (r.ok) photosData.value = { ...(photosData.value ?? {}), [cir]: await r.json() }
  } catch {}
}

const photosForTipo = computed(() => {
  if (!imageModal.value) return []
  return photosData.value[imageModal.value.cir]?.[imagesTipo.value] ?? []
})

function onFileChange(e) { selectedFiles.value = [...e.target.files] }
function handleDrop(e)   { selectedFiles.value = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/')) }
function removeFile(i)   { selectedFiles.value = selectedFiles.value.filter((_, j) => j !== i) }

async function doUpload() {
  if (!imageModal.value || !selectedFiles.value.length) return
  uploading.value = true
  try {
    if (isProd) {
      await uploadProd(imageModal.value.cir, imagesTipo.value, selectedFiles.value)
    } else {
      await uploadLocal(imageModal.value.cir, imagesTipo.value, selectedFiles.value)
      await loadPhotos(imageModal.value.cir)
    }
    toast(`${selectedFiles.value.length} imagen(es) subida(s) ✓`, 'ok')
    selectedFiles.value = []
    if (fileInputRef.value) fileInputRef.value.value = ''
  } catch { toast('Error al subir imágenes', 'err') }
  uploading.value = false
}

async function uploadLocal(cir, tipo, files) {
  await Promise.all([...files].map(async file => {
    const r = await fetch(
      `/api/circuit-photo-upload?circuito=${encodeURIComponent(cir)}&tipo=${encodeURIComponent(tipo)}&filename=${encodeURIComponent(file.name)}`,
      { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file }
    )
    const j = await r.json()
    if (!j.ok) throw new Error(j.error)
  }))
}

async function uploadProd(cir, tipo, files) {
  const r = await fetch(`${ADMIN_API}/images/sas-token`, { method: 'POST', headers: await authHeaders() })
  if (!r.ok) throw new Error('No se pudo obtener token SAS')
  const { sasUrl } = await r.json()
  const u    = new URL(sasUrl)
  const base = `${u.origin}${u.pathname}`
  const sas  = u.search
  await Promise.all([...files].map(async file => {
    const blobPath  = `circuitos/${encodeURIComponent(cir)}/${tipo}/${encodeURIComponent(file.name)}`
    const uploadUrl = `${base}/${blobPath}${sas}`
    const res = await fetch(uploadUrl, {
      method:  'PUT',
      headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    })
    if (!res.ok) throw new Error(`Upload ${res.status}`)
  }))
}

async function deletePhoto(url) {
  const parts    = url.split('/images/circuitos/')[1]
  if (!parts) return
  const [cirEnc, tipo, filename] = parts.split('/')
  const cir = decodeURIComponent(cirEnc)
  try {
    await fetch(`/api/circuit-photo-upload?circuito=${encodeURIComponent(cir)}&tipo=${encodeURIComponent(tipo)}&filename=${encodeURIComponent(filename)}`, { method: 'DELETE' })
    await loadPhotos(cir)
    if (previewUrl.value === url) previewUrl.value = null
    toast('Foto eliminada', 'ok')
  } catch { toast('Error al eliminar', 'err') }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null
function toast(msg, type = 'ok') {
  toastMsg.value = msg; toastType.value = type
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 3500)
}

function onEsc(e) {
  if (e.key === 'Escape') {
    if (previewUrl.value)       { previewUrl.value = null; return }
    if (imageModal.value)       { closeImageModal(); return }
    if (editModal.value)        { closeEditModal(); return }
    if (confirmModal.value)     { cancelConfirm(); return }
    if (activeSubregion.value)  { backToSubregions() }
  }
}
onMounted(() => window.addEventListener('keydown', onEsc))
onUnmounted(() => window.removeEventListener('keydown', onEsc))

// ── Helpers ───────────────────────────────────────────────────────────────────
const avgFisGlobal   = computed(() => !features.value.length ? 0 : +(features.value.reduce((s, f) => s + f.fis, 0) / features.value.length).toFixed(1))
const avgFinGlobal   = computed(() => !features.value.length ? 0 : +(features.value.reduce((s, f) => s + f.fin, 0) / features.value.length).toFixed(1))
const totalKmGlobal  = computed(() => +features.value.reduce((s, f) => s + (f.lkm || 0), 0).toFixed(1))
const totalEstGlobal = computed(() => +features.value.reduce((s, f) => s + (f.est || 0), 0).toFixed(1))

function subAccentClass(avgFis) {
  if (avgFis >= 60) return 'accent--high'
  if (avgFis >= 25) return 'accent--mid'
  return 'accent--low'
}
function titleCase(str) { return (str ?? '').charAt(0).toUpperCase() + (str ?? '').slice(1).toLowerCase() }
function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
</script>

<template>
  <div class="shell">

    <!-- LOGIN OVERLAY -->
    <div v-if="isProd && !isAuthed" class="login-overlay">
      <div class="login-card">
        <img :src="logoSrc" alt="Gobernación" class="login-logo" @error="e => e.target.style.display='none'" />
        <h2 class="login-title">SIMEVA — Editor de Avances</h2>
        <p class="login-sub">Accede con tu cuenta corporativa de la Gobernación de Antioquia</p>
        <button class="btn-ms" @click="doLogin" :disabled="authLoading">
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
            <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
            <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
            <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          {{ authLoading ? 'Iniciando sesión…' : 'Continuar con Microsoft' }}
        </button>
        <p v-if="loginErr" class="login-err">{{ loginErr }}</p>
        <p v-if="authErr"  class="login-err" style="color:#86efac">MSAL: {{ authErr }}</p>
      </div>
    </div>

    <template v-else>

      <!-- ═══ HEADER ═══ -->
      <header class="hdr">
        <div class="hdr-l">
          <img :src="logoSrc" alt="Gobernación" class="hdr-logo" @error="e => e.target.style.display='none'" />
          <div class="hdr-breadcrumb">
            <button class="bc-btn" :class="{ 'bc-btn--active': !activeSubregion }" @click="backToSubregions">Subregiones</button>
            <template v-if="activeSubregion">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12" style="color:rgba(255,255,255,.3)"><path d="M6 3l5 5-5 5"/></svg>
              <span class="bc-current">{{ titleCase(activeSubregion) }}</span>
            </template>
          </div>
        </div>
        <div class="hdr-r">
          <span v-if="totalPend" class="badge badge--warn">{{ totalPend }} cambio{{ totalPend > 1 ? 's' : '' }}</span>
          <span v-if="anyError"  class="badge badge--err">Hay errores</span>
          <button class="btn-save" @click="requestSave" :disabled="saving || !totalPend || anyError">
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
          <div v-if="isProd && isAuthed" class="hdr-user">
            <div class="hdr-user-info">
              <span class="hdr-user-name">{{ userName }}</span>
              <span class="hdr-user-email">{{ userEmail }}</span>
            </div>
            <button class="btn-logout" @click="doLogout" title="Cerrar sesión">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        </div>
      </header>

      <Transition name="toast">
        <div v-if="toastMsg" :class="['toast', toastType === 'err' ? 'toast--err' : 'toast--ok']">{{ toastMsg }}</div>
      </Transition>

      <!-- ═══ KPI STRIP ═══ -->
      <div class="kpi-strip">
        <div class="kpi-item">
          <div class="kpi-icon kpi-icon--fis"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg></div>
          <div class="kpi-body"><span class="kpi-val">{{ avgFisGlobal }}%</span><span class="kpi-label">Av. Físico Prom.</span></div>
        </div>
        <div class="kpi-item">
          <div class="kpi-icon kpi-icon--fin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></div>
          <div class="kpi-body"><span class="kpi-val">{{ avgFinGlobal }}%</span><span class="kpi-label">Av. Financiero Prom.</span></div>
        </div>
        <div class="kpi-item">
          <div class="kpi-icon kpi-icon--est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><path d="M3 17l4-8 4 5 3-3 4 6"/></svg></div>
          <div class="kpi-body"><span class="kpi-val">{{ totalEstGlobal }} km</span><span class="kpi-label">Km Estabilizados</span></div>
        </div>
        <div class="kpi-item">
          <div class="kpi-icon kpi-icon--circ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
          <div class="kpi-body"><span class="kpi-val">{{ features.length }} circ.</span><span class="kpi-label">{{ totalKmGlobal }} km en total</span></div>
        </div>
      </div>

      <div v-if="loading" class="loading"><div class="spinner"></div><span>Cargando datos…</span></div>

      <!-- ═══ VISTA SUBREGIONES ═══ -->
      <div v-else-if="!activeSubregion" class="view-subregions">
        <div class="subregion-grid">
          <article
            v-for="sub in subregiones" :key="sub"
            class="subcard" :class="subAccentClass(subregionStats[sub]?.avgFis ?? 0)"
            @click="selectSubregion(sub)"
          >
            <div class="subcard-hdr">
              <div class="subcard-hdr-deco"></div>
              <div class="subcard-hdr-deco2"></div>
              <div class="subcard-hdr-top">
                <div class="subcard-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                </div>
                <span v-if="subregionStats[sub]?.pendingCount" class="subcard-pend-badge">✎ {{ subregionStats[sub].pendingCount }}</span>
              </div>
              <h2 class="subcard-name">{{ titleCase(sub) }}</h2>
              <div class="subcard-meta">
                <span class="subcard-meta-item"><svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10"><circle cx="8" cy="8" r="3"/></svg>{{ subregionStats[sub]?.count ?? 0 }} circuitos</span>
                <span class="subcard-meta-sep">·</span>
                <span class="subcard-meta-item">{{ subregionStats[sub]?.totalKm ?? 0 }} km</span>
              </div>
            </div>
            <div class="subcard-body">
              <div class="subcard-stats">
                <div class="stat-col">
                  <div class="stat-num">{{ subregionStats[sub]?.avgFis ?? 0 }}<span class="stat-pct">%</span></div>
                  <div class="stat-label">Av. Físico</div>
                  <div class="stat-bar-wrap"><div class="stat-bar stat-bar--fis" :style="{ width: (subregionStats[sub]?.avgFis ?? 0) + '%' }"></div></div>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-col">
                  <div class="stat-num stat-num--fin">{{ subregionStats[sub]?.avgFin ?? 0 }}<span class="stat-pct">%</span></div>
                  <div class="stat-label">Av. Financiero</div>
                  <div class="stat-bar-wrap"><div class="stat-bar stat-bar--fin" :style="{ width: (subregionStats[sub]?.avgFin ?? 0) + '%' }"></div></div>
                </div>
              </div>
              <div v-if="subregionStats[sub]?.totalEst > 0" class="subcard-est">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11"><path d="M2 8h12M10 4l4 4-4 4"/></svg>
                {{ subregionStats[sub].totalEst }} km estabilizados
              </div>
            </div>
            <div class="subcard-footer">
              <span class="subcard-cta">Ver circuitos <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span>
            </div>
          </article>
        </div>
      </div>

      <!-- ═══ VISTA TABLA ═══ -->
      <div v-else class="view-table">
        <div class="tbl-filters">
          <button class="btn-back" @click="backToSubregions">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M13 8H3M7 4l-4 4 4 4"/></svg>
            Volver
          </button>
          <div class="search-wrap">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="5"/><path d="M14 14l3 3"/></svg>
            <input class="inp" v-model="search" placeholder="Buscar circuito, vía, municipio…" />
          </div>
          <select class="sel" v-model="filterCir">
            <option value="">Todos los circuitos</option>
            <option v-for="c in circuitos" :key="c">{{ c }}</option>
          </select>
          <button v-if="search || filterCir" class="btn-clear" @click="clearTableFilters">✕ Limpiar</button>
          <span class="count">{{ tableRows.length }} tramos</span>
          <span class="tbl-hint">Doble clic para editar</span>
        </div>

        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th class="tc-id">#</th>
                <th>Circuito</th>
                <th>Vía</th>
                <th>Municipio</th>
                <th class="tc-num">Long km</th>
                <th class="tc-num">Av. Físico</th>
                <th class="tc-num">Av. Financiero</th>
                <th class="tc-num">Estabilizado</th>
                <th class="tc-act"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="f in tableRows" :key="f._i"
                class="tbl-row"
                :class="{ 'r-changed': pending.has(f._i) && !errs(f).length, 'r-err': pending.has(f._i) && errs(f).length }"
                @dblclick="openEditModal(f)"
              >
                <td class="tc-id">{{ f.id }}</td>
                <td class="tc-cir">{{ f.cir }}</td>
                <td class="tc-via">{{ f.via }}</td>
                <td class="tc-mpio">{{ titleCase(f.mpio) }}</td>
                <td class="tc-num">{{ f.lkm }}</td>
                <td class="tc-num">
                  <div class="cell-prog">
                    <span :class="pending.has(f._i) && Math.abs(f.fis - (originals[f._i]?.fis ?? f.fis)) > 0.005 ? 'val-changed' : ''">{{ f.fis }}%</span>
                    <div class="mini-bar"><div class="mini-fill mini-fill--fis" :style="{ width: Math.min(100,f.fis) + '%' }"></div></div>
                  </div>
                </td>
                <td class="tc-num">
                  <div class="cell-prog">
                    <span :class="pending.has(f._i) && Math.abs(f.fin - (originals[f._i]?.fin ?? f.fin)) > 0.005 ? 'val-changed val-changed--fin' : ''">{{ f.fin }}%</span>
                    <div class="mini-bar"><div class="mini-fill mini-fill--fin" :style="{ width: Math.min(100,f.fin) + '%' }"></div></div>
                  </div>
                </td>
                <td class="tc-num">{{ f.est }} km</td>
                <td class="tc-act">
                  <div class="act-btns">
                    <button class="btn-cam" @click.stop="openImageModal(f)" title="Gestionar fotos">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </button>
                    <span v-if="pending.has(f._i)" class="row-badge" :class="errs(f).length ? 'row-badge--err' : 'row-badge--ok'">
                      {{ errs(f).length ? '⚠' : '✎' }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ═══ MODAL EDICIÓN ═══ -->
      <Transition name="fade">
        <div v-if="editModal" class="overlay" @click.self="closeEditModal">
          <div class="edit-modal">
            <div class="emodal-hdr">
              <div class="emodal-hdr-info">
                <span class="emodal-id">#{{ editModal.id }}</span>
                <div>
                  <div class="emodal-title">{{ editModal.cir }}</div>
                  <div class="emodal-sub">{{ editModal.via }} · {{ titleCase(editModal.mpio) }} · {{ editModal.lkm }} km</div>
                </div>
              </div>
              <button class="modal-close" @click="closeEditModal" title="Cerrar (ESC)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="emodal-body">
              <div class="field-group">
                <div class="field-label"><span>Avance Físico</span><span class="field-val" :class="{ 'fv-err': dFis < 0 || dFis > 100 }">{{ Number(dFis).toFixed(1) }}%</span></div>
                <input type="range" min="0" max="100" step="0.1" v-model.number="dFis" class="slider slider-fis" />
                <div class="slider-labels"><span>0%</span><span>50%</span><span>100%</span></div>
                <input type="number" min="0" max="100" step="0.01" v-model.number="dFis" class="num-field" placeholder="0.00" />
              </div>
              <div class="field-group">
                <div class="field-label"><span>Avance Financiero</span><span class="field-val fv-fin" :class="{ 'fv-err': dFin < 0 || dFin > 100 }">{{ Number(dFin).toFixed(1) }}%</span></div>
                <input type="range" min="0" max="100" step="0.1" v-model.number="dFin" class="slider slider-fin" />
                <div class="slider-labels"><span>0%</span><span>50%</span><span>100%</span></div>
                <input type="number" min="0" max="100" step="0.01" v-model.number="dFin" class="num-field" placeholder="0.00" />
              </div>
              <div class="field-group">
                <div class="field-label"><span>Km Estabilizados</span><span class="field-val fv-est" :class="{ 'fv-err': editModal.lkm > 0 && dEst > editModal.lkm }">{{ Number(dEst).toFixed(2) }} km</span></div>
                <input type="range" min="0" :max="editModal.lkm || 100" step="0.01" v-model.number="dEst" class="slider slider-est" />
                <div class="slider-labels"><span>0</span><span>{{ ((editModal.lkm||100)/2).toFixed(0) }} km</span><span>{{ editModal.lkm || 100 }} km</span></div>
                <input type="number" min="0" :max="editModal.lkm||999999" step="0.01" v-model.number="dEst" class="num-field" placeholder="0.00" />
              </div>
              <div v-if="editErrs.length" class="edit-errs">
                <div v-for="e in editErrs" :key="e" class="edit-err-item">⚠ {{ e }}</div>
              </div>
            </div>
            <div class="emodal-foot">
              <button class="btn-drawer-cancel" @click="closeEditModal">Cancelar</button>
              <button class="btn-drawer-apply" @click="applyEdit" :disabled="editErrs.length > 0">Aplicar cambios</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ═══ MODAL CONFIRMACIÓN ═══ -->
      <Transition name="fade">
        <div v-if="confirmModal" class="overlay" @click.self="cancelConfirm">
          <div class="modal confirm-modal">
            <div class="modal-hdr">
              <div><div class="modal-title">Confirmar cambios</div><div class="modal-sub">Revisá los cambios antes de guardar</div></div>
              <button class="modal-close" @click="cancelConfirm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="confirm-body">
              <div v-for="item in confirmModal" :key="item.f._i" class="confirm-circuit">
                <div class="confirm-circuit-hdr">
                  <span class="confirm-id">#{{ item.f.id }}</span>
                  <div><div class="confirm-circuit-name">{{ item.f.cir }}</div><div class="confirm-circuit-sub">{{ item.f.via }} · {{ titleCase(item.f.mpio) }}</div></div>
                </div>
                <table class="confirm-table">
                  <tbody>
                    <tr v-for="d in item.diffs" :key="d.campo">
                      <td class="conf-campo">{{ d.campo }}</td>
                      <td class="conf-antes">{{ d.antes }}</td>
                      <td class="conf-arrow">→</td>
                      <td class="conf-despues">{{ d.despues }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-foot confirm-foot">
              <span class="confirm-count">{{ confirmModal.length }} circuito(s) a actualizar</span>
              <button class="btn-cancel" @click="cancelConfirm">Cancelar</button>
              <button class="btn-confirm-save" @click="save" :disabled="saving">{{ saving ? 'Guardando…' : 'Confirmar y guardar' }}</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ═══ MODAL IMÁGENES ═══ -->
      <Transition name="fade">
        <div v-if="imageModal" class="overlay" @click.self="closeImageModal">
          <div class="img-modal">

            <!-- Header -->
            <div class="img-modal-hdr">
              <div class="img-modal-hdr-info">
                <div class="img-modal-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <div>
                  <div class="img-modal-title">Fotos del circuito</div>
                  <div class="img-modal-sub">{{ imageModal.cir }} · {{ titleCase(imageModal.mpio) }}</div>
                </div>
              </div>
              <button class="modal-close" @click="closeImageModal" title="Cerrar (ESC)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Tabs -->
            <div class="img-tabs">
              <button
                v-for="t in TIPOS_FOTO" :key="t"
                class="img-tab" :class="{ 'img-tab--active': imagesTipo === t }"
                @click="imagesTipo = t"
              >
                {{ TIPO_LABEL[t] }}
                <span v-if="!isProd" class="img-tab-count">{{ photosData[imageModal.cir]?.[t]?.length ?? 0 }}</span>
              </button>
            </div>

            <!-- Grid de fotos (solo modo local) -->
            <div class="img-grid-wrap">
              <template v-if="!isProd">
                <div v-if="photosForTipo.length" class="img-grid">
                  <div v-for="url in photosForTipo" :key="url" class="img-thumb" @click="previewUrl = url">
                    <img :src="url" alt="" loading="lazy" />
                    <button class="img-del" @click.stop="deletePhoto(url)" title="Eliminar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="10" height="10"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
                <div v-else class="img-empty">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36" style="color:#b0c4b8"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span>Sin fotos de etapa "{{ TIPO_LABEL[imagesTipo] }}"</span>
                </div>
              </template>
              <div v-else class="img-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36" style="color:#b0c4b8"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>Las fotos se almacenan en Azure Blob Storage.<br>Sube nuevas imágenes con el formulario de abajo.</span>
              </div>
            </div>

            <!-- Zona de subida -->
            <div
              class="img-upload-zone"
              :class="{ 'img-upload-zone--has-files': selectedFiles.length }"
              @dragover.prevent
              @drop.prevent="handleDrop"
              @click="!selectedFiles.length && fileInputRef?.click()"
            >
              <input ref="fileInputRef" type="file" multiple accept="image/*" class="file-input" @change="onFileChange" />
              <template v-if="!selectedFiles.length">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28" style="color:#6b9e80"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p class="upload-prompt-text">Arrastra imágenes aquí o <strong>haz clic para seleccionar</strong></p>
                <p class="upload-hint">JPG, PNG, WEBP · Etapa: {{ TIPO_LABEL[imagesTipo] }}</p>
              </template>
              <template v-else>
                <div class="sel-files-list">
                  <div v-for="(file, i) in selectedFiles" :key="i" class="sel-file-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13" style="color:#1a5c3a"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                    <span class="sel-file-name">{{ file.name }}</span>
                    <span class="sel-file-size">{{ fmtSize(file.size) }}</span>
                    <button class="sel-file-del" @click.stop="removeFile(i)">✕</button>
                  </div>
                </div>
              </template>
            </div>

            <!-- Footer -->
            <div class="img-modal-foot">
              <button class="btn-cancel" @click="closeImageModal">Cerrar</button>
              <button
                v-if="selectedFiles.length"
                class="btn-upload"
                @click="doUpload"
                :disabled="uploading"
              >
                <svg v-if="!uploading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" class="spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                {{ uploading ? 'Subiendo…' : `Subir ${selectedFiles.length} imagen${selectedFiles.length > 1 ? 'es' : ''}` }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ═══ LIGHTBOX ═══ -->
      <Transition name="fade">
        <div v-if="previewUrl" class="lightbox" @click="previewUrl = null">
          <img :src="previewUrl" alt="" class="lightbox-img" @click.stop />
          <button class="lightbox-close" @click="previewUrl = null">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </Transition>

    </template>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0 }

.shell { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #f0f4f1; font-family: 'Prompt', sans-serif; color: #1a2e20 }

/* ── Login ── */
.login-overlay { position: fixed; inset: 0; z-index: 200; background: linear-gradient(135deg, #052318 0%, #0a4d38 60%, #1a7a56 100%); display: flex; align-items: center; justify-content: center; padding: 20px }
.login-card { background: #fff; border-radius: 16px; padding: 36px 40px; width: 100%; max-width: 460px; box-shadow: 0 24px 60px rgba(0,0,0,.35); display: flex; flex-direction: column; gap: 14px; align-items: center }
.login-logo  { height: 52px; width: auto; margin-bottom: 4px }
.login-title { font-size: 17px; font-weight: 700; color: #0a4d38; text-align: center }
.login-sub   { font-size: 12px; color: #6b9e80; text-align: center; line-height: 1.5 }
.login-err   { font-size: 11px; color: #166534; align-self: flex-start }
.btn-ms { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 11px 20px; border-radius: 9px; border: 1.5px solid #d1d5db; background: #fff; font-size: 14px; font-weight: 600; color: #1a1a1a; cursor: pointer; transition: background .15s; font-family: inherit }
.btn-ms:hover:not(:disabled) { background: #f3f4f6 }
.btn-ms:disabled { opacity: .6; cursor: not-allowed }

/* ── Header ── */
.hdr { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; height: 54px; flex-shrink: 0; background: #0f3d27 }
.hdr-l { display: flex; align-items: center; gap: 16px }
.hdr-logo { height: 30px; width: auto }
.hdr-breadcrumb { display: flex; align-items: center; gap: 8px }
.bc-btn { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.55); background: none; border: none; cursor: pointer; font-family: 'Prompt', sans-serif; padding: 4px 0; transition: color .15s }
.bc-btn:hover, .bc-btn--active { color: #fff }
.bc-current { font-size: 13px; font-weight: 700; color: #fff }
.hdr-r { display: flex; align-items: center; gap: 10px }
.badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 99px }
.badge--warn { background: rgba(217,119,6,.15); border: 1px solid rgba(217,119,6,.4); color: #fde68a }
.badge--err  { background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.4); color: #fca5a5 }
.btn-save { padding: 7px 18px; border-radius: 8px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.12); color: #fff; font-family: 'Prompt', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s }
.btn-save:hover:not(:disabled) { background: rgba(255,255,255,.22) }
.btn-save:disabled { opacity: .4; cursor: default }
.hdr-user { display: flex; align-items: center; gap: 8px; padding-left: 12px; border-left: 1px solid rgba(255,255,255,.15) }
.hdr-user-info { display: flex; flex-direction: column; align-items: flex-end }
.hdr-user-name  { font-size: 12px; font-weight: 700; color: #fff }
.hdr-user-email { font-size: 10px; color: rgba(255,255,255,.5) }
.btn-logout { width: 30px; height: 30px; border-radius: 7px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.08); color: rgba(255,255,255,.7); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s }
.btn-logout:hover { background: rgba(255,255,255,.2) }
.btn-logout svg { width: 14px; height: 14px }

/* ── Toast ── */
.toast { position: fixed; top: 64px; right: 20px; z-index: 999; padding: 10px 18px; border-radius: 8px; font-size: 12px; font-weight: 600; box-shadow: 0 4px 20px rgba(0,0,0,.18); pointer-events: none }
.toast--ok  { background: #0f3d27; color: #fff }
.toast--err { background: #991b1b; color: #fff }
.toast-enter-active, .toast-leave-active { transition: all .25s }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px) }

/* ── KPI Strip ── */
.kpi-strip { display: flex; flex-shrink: 0; background: #fff; border-bottom: 1px solid #e0ece4 }
.kpi-item { flex: 1; padding: 12px 20px; display: flex; align-items: center; gap: 10px; border-right: 1px solid #f0f4f1 }
.kpi-item:last-child { border-right: none }
.kpi-icon { width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center }
.kpi-icon--fis  { background: #dcfce7; color: #16a34a }
.kpi-icon--fin  { background: #fef3c7; color: #d97706 }
.kpi-icon--est  { background: #dbeafe; color: #2563eb }
.kpi-icon--circ { background: #f3e8ff; color: #9333ea }
.kpi-body { display: flex; flex-direction: column; gap: 1px }
.kpi-val   { font-size: 18px; font-weight: 700; color: #1a2e20 }
.kpi-label { font-size: 10px; color: #6b9e80 }

/* ── Loading ── */
.loading { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #6b9e80 }
.spinner { width: 36px; height: 36px; border-radius: 50%; border: 3px solid #d4eddf; border-top-color: #1a5c3a; animation: spin .7s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

/* ════════════════════════════════════════
   VISTA SUBREGIONES — Colores institucionales verde/blanco
════════════════════════════════════════ */
.view-subregions { flex: 1; overflow-y: auto; padding: 28px 28px 48px }
.view-subregions::-webkit-scrollbar { width: 6px }
.view-subregions::-webkit-scrollbar-thumb { background: #b8d4c0; border-radius: 3px }
.subregion-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 22px }

.subcard { background: #fff; border-radius: 18px; overflow: hidden; border: 1.5px solid #e0ece4; cursor: pointer; display: flex; flex-direction: column; transition: transform .2s ease, box-shadow .2s ease }
.subcard:hover { transform: translateY(-5px); box-shadow: 0 16px 40px rgba(10,30,18,.16) }
.subcard:active { transform: translateY(-2px) }

.subcard-hdr { padding: 22px 22px 20px; position: relative; overflow: hidden }

/* ── Paleta verde institucional (sin rojo ni naranja) ── */
.accent--high .subcard-hdr { background: linear-gradient(135deg, #052a18 0%, #0f4a2a 100%) }
.accent--mid  .subcard-hdr { background: linear-gradient(135deg, #0d4a2e 0%, #1a6e44 100%) }
.accent--low  .subcard-hdr { background: linear-gradient(135deg, #1a5c3a 0%, #2e8b57 100%) }

.subcard-hdr-deco  { position: absolute; right: -24px; top: -24px; width: 110px; height: 110px; border-radius: 50%; background: rgba(255,255,255,.07); pointer-events: none }
.subcard-hdr-deco2 { position: absolute; right: 30px; bottom: -30px; width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,.05); pointer-events: none }
.subcard-hdr-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px }
.subcard-icon { width: 32px; height: 32px; border-radius: 9px; background: rgba(255,255,255,.15); display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,.9) }
.subcard-pend-badge { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 99px; background: rgba(255,255,255,.15); color: #fff; border: 1px solid rgba(255,255,255,.25) }
.subcard-name { font-size: 20px; font-weight: 700; color: #fff; line-height: 1.2; margin-bottom: 8px; letter-spacing: -.01em }
.subcard-meta { display: flex; align-items: center; gap: 6px }
.subcard-meta-item { font-size: 11px; color: rgba(255,255,255,.65); display: flex; align-items: center; gap: 4px; font-weight: 500 }
.subcard-meta-sep { color: rgba(255,255,255,.3); font-size: 11px }
.subcard-body { padding: 20px 22px 14px; flex: 1 }
.subcard-stats { display: flex; align-items: stretch; margin-bottom: 16px }
.stat-col { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 0 8px }
.stat-col:first-child { padding-left: 0 }
.stat-col:last-child  { padding-right: 0 }
.stat-num { font-size: 32px; font-weight: 700; color: #1a2e20; line-height: 1; letter-spacing: -.02em }
.stat-num--fin { color: #c2620a }
.stat-pct { font-size: 16px; font-weight: 400; color: #6b9e80; margin-left: 1px }
.stat-label { font-size: 10px; font-weight: 600; color: #9ab5a3; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 6px }
.stat-bar-wrap { height: 6px; background: #edf2ef; border-radius: 3px; overflow: hidden }
.stat-bar { height: 100%; border-radius: 3px; transition: width .7s cubic-bezier(.4,0,.2,1) }
.stat-bar--fis { background: linear-gradient(90deg, #1a5c3a, #22c55e) }
.stat-bar--fin { background: linear-gradient(90deg, #c2620a, #f59e0b) }
.stat-divider { width: 1px; background: #e8f0eb; margin: 4px 4px }
.subcard-est { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #6b9e80; font-weight: 600; padding: 8px 10px; border-radius: 8px; background: #f5f9f6 }
.subcard-footer { padding: 12px 22px; border-top: 1px solid #f0f4f1; display: flex; align-items: center; justify-content: flex-end }
.subcard-cta { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #9ab5a3; letter-spacing: .05em; text-transform: uppercase; transition: color .15s }
.subcard:hover .subcard-cta { color: #1a5c3a }

/* ════════════════════════════════════════
   VISTA TABLA
════════════════════════════════════════ */
.view-table { flex: 1; display: flex; flex-direction: column; overflow: hidden }
.tbl-filters { display: flex; align-items: center; gap: 10px; padding: 10px 24px; flex-shrink: 0; background: #fff; border-bottom: 1px solid #e0ece4; flex-wrap: wrap }
.btn-back { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 8px; border: 1px solid #c2d9cb; background: #f5f9f6; color: #2e6649; font-family: 'Prompt', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s; white-space: nowrap }
.btn-back:hover { background: #e8f0eb }
.search-wrap { position: relative; flex: 1; min-width: 180px }
.search-wrap svg { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; stroke: #6b9e80; pointer-events: none }
.inp { width: 100%; padding: 7px 8px 7px 30px; background: #f5f9f6; border: 1px solid #c2d9cb; border-radius: 7px; color: #1a2e20; font-family: 'Prompt', sans-serif; font-size: 12px; outline: none }
.inp:focus { border-color: #1a5c3a; box-shadow: 0 0 0 3px rgba(26,92,58,.1) }
.sel { padding: 7px 10px; background: #f5f9f6; border: 1px solid #c2d9cb; border-radius: 7px; color: #1a2e20; font-family: 'Prompt', sans-serif; font-size: 12px; outline: none; cursor: pointer }
.sel:focus { border-color: #1a5c3a }
.btn-clear { padding: 6px 12px; border-radius: 7px; border: 1px solid rgba(22,101,52,.25); background: rgba(22,101,52,.07); color: #166534; font-family: 'Prompt', sans-serif; font-size: 11px; font-weight: 700; cursor: pointer }
.count { font-size: 11px; color: #6b9e80; font-weight: 600; white-space: nowrap }
.tbl-hint { font-size: 10px; color: #a8c9b5; margin-left: auto; white-space: nowrap; font-style: italic }
.tbl-wrap { flex: 1; overflow: auto; background: #f8fbf9 }
.tbl-wrap::-webkit-scrollbar { width: 5px; height: 5px }
.tbl-wrap::-webkit-scrollbar-thumb { background: #a8c9b5; border-radius: 3px }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px }
.tbl thead th { position: sticky; top: 0; z-index: 5; background: #e8f0eb; color: #2e6649; font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; padding: 10px 14px; border-bottom: 2px solid #c2d9cb; text-align: left; white-space: nowrap }
.tc-num  { text-align: center }
.tc-id   { text-align: center; width: 40px }
.tc-act  { width: 60px; text-align: center }
.tc-cir  { min-width: 180px }
.tc-via  { min-width: 160px }
.tc-mpio { min-width: 120px }
.tbl-row { cursor: default; user-select: none }
.tbl-row:hover td { background: #f0f8f3 !important }
.tbl tbody td { padding: 11px 14px; border-bottom: 1px solid #edf2ef; background: #fff; vertical-align: middle }
.tbl-row:last-child td { border-bottom: none }
.r-changed td { background: #fffbeb !important }
.r-err     td { background: #f0fdf4 !important }
.cell-prog { display: flex; flex-direction: column; align-items: center; gap: 4px }
.mini-bar { width: 60px; height: 4px; background: #e8f0eb; border-radius: 2px; overflow: hidden }
.mini-fill { height: 100%; border-radius: 2px }
.mini-fill--fis { background: #1a5c3a }
.mini-fill--fin { background: #d97706 }
.val-changed     { color: #1a5c3a; font-weight: 700 }
.val-changed--fin { color: #d97706; font-weight: 700 }
.act-btns { display: flex; align-items: center; justify-content: center; gap: 6px }
.btn-cam { width: 28px; height: 28px; border-radius: 7px; border: 1px solid #c2d9cb; background: #f5f9f6; color: #3d6b50; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; flex-shrink: 0 }
.btn-cam:hover { background: #1a5c3a; color: #fff; border-color: #1a5c3a }
.row-badge { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 6px }
.row-badge--ok  { background: rgba(124,58,237,.1); color: #7c3aed }
.row-badge--err { background: rgba(22,101,52,.1); color: #166534 }

/* ════════════════════════════════════════
   OVERLAYS Y MODALES COMUNES
════════════════════════════════════════ */
.overlay { position: fixed; inset: 0; z-index: 100; background: rgba(8,20,12,.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px }
.modal-close { width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.1); color: rgba(255,255,255,.8); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: background .15s }
.modal-close:hover { background: rgba(255,255,255,.25) }
.fade-enter-active, .fade-leave-active { transition: opacity .2s }
.fade-enter-from, .fade-leave-to { opacity: 0 }

/* ── Modal edición ── */
.edit-modal { background: #fff; border-radius: 18px; overflow: hidden; width: 480px; max-width: 95vw; box-shadow: 0 24px 64px rgba(15,61,39,.28); display: flex; flex-direction: column }
.emodal-hdr { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px; background: #0f3d27; flex-shrink: 0 }
.emodal-hdr-info { display: flex; align-items: flex-start; gap: 12px }
.emodal-id { font-size: 11px; font-weight: 700; color: #fff; background: rgba(255,255,255,.2); padding: 2px 10px; border-radius: 99px; white-space: nowrap; margin-top: 3px }
.emodal-title { font-size: 15px; font-weight: 700; color: #fff; line-height: 1.3 }
.emodal-sub   { font-size: 11px; color: rgba(255,255,255,.55); margin-top: 3px }
.emodal-body { padding: 28px 24px; display: flex; flex-direction: column; gap: 26px }
.field-group { display: flex; flex-direction: column; gap: 8px }
.field-label { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; color: #2e6649 }
.field-val { font-size: 18px; font-weight: 700; color: #1a5c3a }
.fv-fin { color: #d97706 }
.fv-est { color: #2563eb }
.fv-err { color: #991b1b !important }
.slider { width: 100%; height: 6px; appearance: none; border-radius: 3px; outline: none; cursor: pointer }
.slider-fis { accent-color: #1a5c3a }
.slider-fin { accent-color: #d97706 }
.slider-est { accent-color: #2563eb }
.slider::-webkit-slider-thumb { appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 2px solid currentColor; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.18) }
.slider-fis::-webkit-slider-thumb { border-color: #1a5c3a }
.slider-fin::-webkit-slider-thumb { border-color: #d97706 }
.slider-est::-webkit-slider-thumb { border-color: #2563eb }
.slider-labels { display: flex; justify-content: space-between; font-size: 9px; color: #b0c4b8; padding: 0 2px }
.num-field { width: 100%; padding: 11px 14px; background: #f5f9f6; border: 1.5px solid #c2d9cb; border-radius: 9px; color: #1a2e20; font-family: 'Prompt', sans-serif; font-size: 17px; font-weight: 700; text-align: center; outline: none; transition: border-color .15s }
.num-field:focus { border-color: #1a5c3a; box-shadow: 0 0 0 3px rgba(26,92,58,.1) }
.num-field::-webkit-inner-spin-button { opacity: .4 }
.edit-errs { display: flex; flex-direction: column; gap: 6px }
.edit-err-item { font-size: 11px; font-weight: 600; color: #166534; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 7px; padding: 8px 12px }
.emodal-foot { display: flex; gap: 12px; padding: 18px 24px; border-top: 1px solid #e8f0eb; flex-shrink: 0 }
.btn-drawer-cancel { flex: 1; padding: 12px; border-radius: 9px; border: 1px solid #c2d9cb; background: #f5f9f6; color: #3d6b50; font-family: 'Prompt', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s }
.btn-drawer-cancel:hover { background: #e8f0eb }
.btn-drawer-apply { flex: 2; padding: 12px; border-radius: 9px; border: 1px solid #1a5c3a; background: #1a5c3a; color: #fff; font-family: 'Prompt', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer; transition: background .15s }
.btn-drawer-apply:hover:not(:disabled) { background: #0f3d27 }
.btn-drawer-apply:disabled { opacity: .4; cursor: not-allowed }

/* ── Modal confirmación ── */
.modal { background: #fff; border-radius: 16px; width: 520px; max-width: 95vw; box-shadow: 0 24px 64px rgba(26,92,58,.25) }
.modal-hdr { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 22px 16px; background: #0f3d27; border-radius: 16px 16px 0 0 }
.modal-title { font-size: 15px; font-weight: 700; color: #fff }
.modal-sub   { font-size: 10px; color: rgba(255,255,255,.55); margin-top: 3px }
.confirm-body { max-height: 52vh; overflow-y: auto; padding: 18px 22px; display: flex; flex-direction: column; gap: 14px }
.confirm-body::-webkit-scrollbar { width: 4px }
.confirm-body::-webkit-scrollbar-thumb { background: #a8c9b5; border-radius: 2px }
.confirm-circuit { background: #f5f9f6; border: 1px solid #d4eddf; border-radius: 10px; overflow: hidden }
.confirm-circuit-hdr { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #e8f0eb; border-bottom: 1px solid #d4eddf }
.confirm-id { font-size: 11px; font-weight: 700; color: #fff; background: #1a5c3a; padding: 2px 8px; border-radius: 99px; white-space: nowrap }
.confirm-circuit-name { font-size: 12px; font-weight: 700; color: #1a2e20 }
.confirm-circuit-sub  { font-size: 10px; color: #6b9e80; margin-top: 1px }
.confirm-table { width: 100%; border-collapse: collapse; font-size: 11px }
.confirm-table td { padding: 7px 14px; border-top: 1px solid #e0ece4 }
.conf-campo   { font-weight: 600; color: #3d6b50; width: 130px }
.conf-antes   { color: #9ca3af; text-decoration: line-through }
.conf-arrow   { color: #6b9e80; text-align: center; width: 24px }
.conf-despues { font-weight: 700; color: #1a5c3a }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 22px; border-top: 1px solid #e0ece4 }
.confirm-foot { align-items: center }
.confirm-count { font-size: 11px; color: #6b9e80; font-weight: 600; margin-right: auto }
.btn-cancel { padding: 9px 18px; border-radius: 8px; border: 1px solid #c2d9cb; background: #f5f9f6; color: #3d6b50; font-family: 'Prompt', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer }
.btn-cancel:hover { background: #e8f0eb }
.btn-confirm-save { padding: 9px 22px; border-radius: 8px; border: 1px solid #0f3d27; background: #0f3d27; color: #fff; font-family: 'Prompt', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer }
.btn-confirm-save:hover:not(:disabled) { background: #071f14 }
.btn-confirm-save:disabled { opacity: .45; cursor: default }

/* ════════════════════════════════════════
   MODAL IMÁGENES
════════════════════════════════════════ */
.img-modal { background: #fff; border-radius: 18px; overflow: hidden; width: 680px; max-width: 96vw; max-height: 90vh; box-shadow: 0 24px 64px rgba(15,61,39,.3); display: flex; flex-direction: column }

.img-modal-hdr { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; background: #0f3d27; flex-shrink: 0 }
.img-modal-hdr-info { display: flex; align-items: center; gap: 12px }
.img-modal-icon { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,.15); display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0 }
.img-modal-title { font-size: 15px; font-weight: 700; color: #fff }
.img-modal-sub   { font-size: 11px; color: rgba(255,255,255,.55); margin-top: 2px }

.img-tabs { display: flex; gap: 0; padding: 0 24px; background: #f5f9f6; border-bottom: 1px solid #e0ece4; flex-shrink: 0 }
.img-tab { padding: 12px 20px; font-family: 'Prompt', sans-serif; font-size: 12px; font-weight: 600; color: #6b9e80; background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; transition: all .15s; display: flex; align-items: center; gap: 7px }
.img-tab:hover { color: #1a5c3a }
.img-tab--active { color: #1a5c3a; border-bottom-color: #1a5c3a }
.img-tab-count { font-size: 10px; font-weight: 700; background: #d4eddf; color: #1a5c3a; padding: 1px 7px; border-radius: 99px }
.img-tab--active .img-tab-count { background: #1a5c3a; color: #fff }

.img-grid-wrap { flex: 1; overflow-y: auto; padding: 18px 24px; min-height: 140px; max-height: 280px; background: #f8fbf9 }
.img-grid-wrap::-webkit-scrollbar { width: 5px }
.img-grid-wrap::-webkit-scrollbar-thumb { background: #a8c9b5; border-radius: 3px }
.img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px }
.img-thumb { position: relative; aspect-ratio: 1; border-radius: 10px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: border-color .15s }
.img-thumb:hover { border-color: #1a5c3a }
.img-thumb img { width: 100%; height: 100%; object-fit: cover; display: block }
.img-del { position: absolute; top: 5px; right: 5px; width: 22px; height: 22px; border-radius: 50%; background: rgba(15,61,39,.75); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .15s }
.img-thumb:hover .img-del { opacity: 1 }
.img-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; height: 100%; min-height: 120px; color: #9ab5a3; font-size: 12px; text-align: center; line-height: 1.6 }

.img-upload-zone { margin: 0 24px 0; border: 2px dashed #c2d9cb; border-radius: 12px; padding: 20px; cursor: pointer; transition: all .2s; background: #f8fbf9; flex-shrink: 0 }
.img-upload-zone:hover, .img-upload-zone--has-files { border-color: #1a5c3a; background: #f0f8f3 }
.file-input { display: none }
.upload-prompt-text { font-size: 13px; color: #3d6b50; margin: 8px 0 4px; text-align: center }
.upload-hint { font-size: 11px; color: #9ab5a3; text-align: center }
.sel-files-list { display: flex; flex-direction: column; gap: 6px }
.sel-file-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: #fff; border: 1px solid #d4eddf; border-radius: 8px }
.sel-file-name { flex: 1; font-size: 12px; color: #1a2e20; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
.sel-file-size { font-size: 10px; color: #9ab5a3; white-space: nowrap }
.sel-file-del  { background: none; border: none; color: #9ab5a3; cursor: pointer; font-size: 12px; padding: 0 4px; transition: color .15s }
.sel-file-del:hover { color: #991b1b }

.img-modal-foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid #e0ece4; flex-shrink: 0 }
.btn-upload { display: flex; align-items: center; gap: 8px; padding: 9px 22px; border-radius: 8px; border: 1px solid #1a5c3a; background: #1a5c3a; color: #fff; font-family: 'Prompt', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s }
.btn-upload:hover:not(:disabled) { background: #0f3d27 }
.btn-upload:disabled { opacity: .5; cursor: not-allowed }
.spin { animation: spin .8s linear infinite }

/* ── Lightbox ── */
.lightbox { position: fixed; inset: 0; z-index: 200; background: rgba(5,15,8,.92); display: flex; align-items: center; justify-content: center; cursor: zoom-out }
.lightbox-img { max-width: 92vw; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 8px 48px rgba(0,0,0,.5); cursor: default }
.lightbox-close { position: fixed; top: 20px; right: 24px; width: 40px; height: 40px; border-radius: 10px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.1); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s }
.lightbox-close:hover { background: rgba(255,255,255,.25) }
</style>
