<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAdminAuth } from '../composables/useAdminAuth.js'

const logoSrc  = '/images/escudo.png'
const { isAuthed, userName, userEmail, authErr, loading: authLoading, initAuth, login, logout, authHeaders } = useAdminAuth()

// ── Entorno ───────────────────────────────────────────────────────────────────
// En producción, VITE_ADMIN_API apunta a https://apim-simeva-qa.azure-api.net/administracion
// En local, queda vacío y se usan los Vite plugins.
const ADMIN_API  = import.meta.env.VITE_ADMIN_API ?? ''
const isProd     = !!ADMIN_API
const LOCAL_API  = '/api/localizacion'          // POST (Vite dev server only)
const GEO_FILE   = import.meta.env.VITE_API_LOCALIZACIONES ?? '/data/localizacion.geojson'

// ── Estado ────────────────────────────────────────────────────────────────────
const rawGeoJson = ref(null)
const features   = ref([])
const loading    = ref(true)
const saving     = ref(false)
const toastMsg   = ref('')
const toastType  = ref('ok')
const search     = ref('')
const filterSub  = ref('')
const filterCir  = ref('')
const pending    = ref(new Set())

// Modal slider
const modal    = ref(null)
const modalVal = ref(0)

// Login Microsoft
const loginErr = ref('')

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
  try {
    await login()
    // login() redirige a Microsoft — el código después no se ejecuta.
    // Al regresar, initAuth() en onMounted procesará la sesión y llamará load().
  } catch (e) {
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
async function load() {
  if (isProd && !isAuthed.value) return
  loading.value = true
  try {
    if (isProd) {
      await loadProd()
    } else {
      await loadLocal()
    }
  } catch (e) {
    toast('Error al cargar los datos. Si el problema persiste, contacta al administrador.', 'err')
  }
  loading.value = false
}

async function loadLocal() {
  const r = await fetch(GEO_FILE)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  rawGeoJson.value = await r.json()
  features.value = rawGeoJson.value.features.map((f, i) => ({
    _i:   i,
    name: f.properties.name        ?? f.properties.NOMBRE_VIA ?? '',
    cir:  f.properties.CIRCUITO    ?? '',
    via:  f.properties.NOMBRE_VIA  ?? '',
    mpio: f.properties.MPIO_NOMBR  ?? '',
    sub:  f.properties.SUBREGION   ?? '',
    lkm:  f.properties.Long_km     ?? 0,
    fis:  +(f.properties.AV_FISICO  * 100).toFixed(2),
    fin:  +(f.properties.AV_FINAN   * 100).toFixed(2),
    est:  f.properties.ESTABILIZADO ?? 0,
  }))
}

async function loadProd() {
  // Carga el GeoJSON para metadata (subregión, municipio, km, nombre) desde el blob
  const geoUrl = import.meta.env.VITE_API_LOCALIZACIONES
  const [geoRes, circRes] = await Promise.all([
    fetch(geoUrl),
    fetch(`${ADMIN_API}/circuits`, { headers: await authHeaders() }),
  ])
  if (!geoRes.ok)  throw new Error(`GeoJSON HTTP ${geoRes.status}`)
  if (!circRes.ok) throw new Error(`Circuits API HTTP ${circRes.status}`)

  const geoJson = await geoRes.json()
  const { circuits } = await circRes.json()

  // Índice de progreso por partitionKey (= name en GeoJSON)
  const progIdx = {}
  for (const c of (circuits ?? [])) progIdx[String(c.partitionKey)] = c

  rawGeoJson.value = geoJson.data?.type === 'FeatureCollection' ? geoJson.data : geoJson

  features.value = rawGeoJson.value.features.map((f, i) => {
    const name   = f.properties.name ?? f.properties.NOMBRE_VIA ?? ''
    const featId = f.properties.id   ?? (i + 1)
    const prog   = progIdx[String(featId)]
    return {
      _i:   i,
      id:   featId,
      name,
      cir:  f.properties.CIRCUITO   ?? '',
      via:  f.properties.NOMBRE_VIA ?? '',
      mpio: f.properties.MPIO_NOMBR ?? '',
      sub:  f.properties.SUBREGION  ?? '',
      lkm:  f.properties.Long_km    ?? 0,
      fis:  +(( prog ? prog.AV_FISICO : f.properties.AV_FISICO ) * 100).toFixed(2),
      fin:  +(( prog ? prog.AV_FINAN  : f.properties.AV_FINAN  ) * 100).toFixed(2),
      est:  prog ? prog.ESTABILIZADO : (f.properties.ESTABILIZADO ?? 0),
    }
  })
}

onMounted(async () => { await initAuth(); load() })

// ── Filtros ───────────────────────────────────────────────────────────────────
const subregiones = computed(() => [...new Set(features.value.map(f => f.sub))].sort())
const circuitos   = computed(() => {
  const src = filterSub.value ? features.value.filter(f => f.sub === filterSub.value) : features.value
  return [...new Set(src.map(f => f.cir))].sort()
})
const rows = computed(() => {
  const q = search.value.toLowerCase()
  return features.value.filter(f => {
    if (filterSub.value && f.sub !== filterSub.value) return false
    if (filterCir.value && f.cir !== filterCir.value) return false
    if (q && !f.cir.toLowerCase().includes(q) && !f.via.toLowerCase().includes(q) && !f.mpio.toLowerCase().includes(q)) return false
    return true
  })
})

function clearFilters() { search.value = ''; filterSub.value = ''; filterCir.value = '' }
function onEsc(e) { if (e.key === 'Escape') { if (modal.value) closeModal(); else clearFilters() } }
onMounted(() => window.addEventListener('keydown', onEsc))
onUnmounted(() => window.removeEventListener('keydown', onEsc))

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

function mark(f) { pending.value = new Set(pending.value.add(f._i)) }

// ── Guardado ─────────────────────────────────────────────────────────────────
async function save() {
  for (const f of features.value) {
    if (pending.value.has(f._i) && errs(f).length) {
      toast('Corrija los errores antes de guardar', 'err'); return
    }
  }
  saving.value = true
  try {
    if (isProd) {
      await saveProd()
    } else {
      await saveLocal()
    }
  } catch (e) { toast('Error al guardar. Si el problema persiste, contacta al administrador.', 'err') }
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
  const r = await fetch(LOCAL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gj),
  })
  const ct = r.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    throw new Error('El servidor de escritura no está disponible. Configura VITE_ADMIN_API para guardar en este entorno.')
  }
  const j = await r.json()
  if (!j.ok) throw new Error(j.error)
  rawGeoJson.value = gj
  pending.value = new Set()
  toast('Guardado correctamente ✓', 'ok')
}

async function saveProd() {
  const toSave = features.value.filter(f => pending.value.has(f._i) && !errs(f).length)
  if (!toSave.length) { toast('Sin cambios válidos para guardar', 'err'); return }

  let errors = 0
  await Promise.all(toSave.map(async f => {
    const id = encodeURIComponent(f.name)
    const r  = await fetch(`${ADMIN_API}/circuits/${id}/progress`, {
      method:  'PUT',
      headers: await authHeaders(),
      body: JSON.stringify({
        progressPhysical:  f.fis,
        progressFinancial: f.fin,
        kmStabilized:      f.est,
      }),
    })
    if (!r.ok) {
      if (r.status === 401) { toast('Sesión expirada — vuelve a iniciar sesión', 'err'); logout(); }
      errors++
    }
  }))

  if (errors) {
    toast(`${errors} circuito(s) no se pudieron guardar`, 'err')
  } else {
    pending.value = new Set()
    toast(`${toSave.length} circuito(s) actualizados ✓`, 'ok')
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(feat, field, label, max) {
  modal.value    = { feat, field, label, max }
  modalVal.value = feat[field]
}

// ── Módulo de imágenes ────────────────────────────────────────────────────────
const pageLoadTs = Date.now()

function photoUrl(idCircuito, tipo) {
  if (!idCircuito) return null
  const ts = photoTs.value[`${idCircuito}/${tipo}`] || pageLoadTs
  return `${AZURE_PHOTOS_BASE}/${encodeURIComponent(idCircuito)}/${tipo}.png?t=${ts}`
}
function closeModal() { modal.value = null }
function applyModal() {
  if (!modal.value) return
  const { feat, field } = modal.value
  feat[field] = modalVal.value
  mark(feat)
  closeModal()
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer = null
function toast(msg, type = 'ok') {
  toastMsg.value = msg; toastType.value = type
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = '' }, 3500)
}
</script>

<template>
  <div class="shell">

    <!-- ── LOGIN OVERLAY (solo modo prod sin sesión) ── -->
    <div v-if="isProd && !isAuthed" class="login-overlay">
      <div class="login-card">
        <img :src="logoSrc" alt="Gobernación" class="login-logo" @error="e => e.target.style.display='none'" />
        <h2 class="login-title">SIMEVA — Editor de Avances</h2>
        <p class="login-sub">Accede con tu cuenta corporativa de la Gobernación de Antioquia</p>
        <button class="btn-ms" @click="doLogin" :disabled="authLoading">
          <!-- Logo de Microsoft (4 cuadros) -->
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1"  y="1"  width="9" height="9" fill="#F25022"/>
            <rect x="11" y="1"  width="9" height="9" fill="#7FBA00"/>
            <rect x="1"  y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          {{ authLoading ? 'Iniciando sesión…' : 'Continuar con Microsoft' }}
        </button>
        <p v-if="loginErr" class="login-err">{{ loginErr }}</p>
        <p v-if="authErr" class="login-err" style="margin-top: 10px; color: #fca5a5;">Depuración MSAL: {{ authErr }}</p>
      </div>
    </div>

    <!-- ── SHELL PRINCIPAL ── -->
    <template v-else>

      <!-- Header -->
      <header class="hdr">
        <div class="hdr-l">
          <img :src="logoSrc" alt="Gobernación" class="hdr-logo" @error="e => e.target.style.display='none'" />
          <div>
            <div class="hdr-title">Editor de Avances — {{ isProd ? 'Azure API' : 'GeoJSON local' }}</div>
            <div class="hdr-sub">AV_FISICO · AV_FINAN · ESTABILIZADO{{ isProd ? ' · PUT /circuits/{id}/progress' : ' · localizacion.geojson' }}</div>
          </div>
        </div>
        <div class="hdr-r">
          <span v-if="totalPend" class="badge badge--warn">{{ totalPend }} cambio{{ totalPend > 1 ? 's' : '' }}</span>
          <span v-if="anyError"  class="badge badge--err">Hay errores</span>
          <button class="btn-save" @click="save" :disabled="saving || !totalPend || anyError">
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

      <!-- Toast -->
      <Transition name="toast">
        <div v-if="toastMsg" :class="['toast', toastType === 'err' ? 'toast--err' : 'toast--ok']">{{ toastMsg }}</div>
      </Transition>

      <!-- Filters -->
      <div class="filters">
        <div class="search-wrap">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="5"/><path d="M14 14l3 3"/></svg>
          <input class="inp" v-model="search" placeholder="Buscar circuito, vía, municipio… (ESC limpia)" />
        </div>
        <select class="sel" v-model="filterSub" @change="filterCir=''">
          <option value="">Todas las subregiones</option>
          <option v-for="s in subregiones" :key="s">{{ s }}</option>
        </select>
        <select class="sel" v-model="filterCir">
          <option value="">Todos los circuitos</option>
          <option v-for="c in circuitos" :key="c">{{ c }}</option>
        </select>
        <button v-if="search||filterSub||filterCir" class="btn-clear" @click="clearFilters">✕ Limpiar</button>
        <span class="count">{{ rows.length }} tramos</span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading"><div class="spinner"></div><span>Cargando…</span></div>

      <!-- Table -->
      <div v-else class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th class="tc-info">Circuito / Vía</th>
              <th>Municipio</th>
              <th>Subregión</th>
              <th class="tc-num">Long km</th>
              <th class="tc-num">Av. Físico %</th>
              <th class="tc-num">Av. Financiero %</th>
              <th class="tc-num">Estabilizado km</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="f in rows" :key="f._i">
              <tr :class="{ 'r-changed': pending.has(f._i), 'r-err': pending.has(f._i) && errs(f).length }">
                <td class="tc-info">
                  <div class="cell-main">{{ f.cir }}</div>
                  <div class="cell-sec">{{ f.via }}</div>
                </td>
                <td class="tc-mpio">{{ f.mpio }}</td>
                <td><span class="pill">{{ f.sub }}</span></td>
                <td class="tc-num km-val">{{ f.lkm }}</td>

                <!-- AV_FISICO -->
                <td class="tc-num" @dblclick="openModal(f,'fis','Av. Físico',100)">
                  <div class="cell-field" :class="{ 'field-err': pending.has(f._i) && (f.fis<0||f.fis>100) }">
                    <input type="number" min="0" max="100" step="0.01" v-model.number="f.fis" @input="mark(f)" class="num-inp" />
                    <span class="unit">%</span>
                  </div>
                  <div class="bar"><div class="bar-fill bar-fis" :style="{width:Math.min(100,Math.max(0,f.fis))+'%'}"></div></div>
                </td>

                <!-- AV_FINAN -->
                <td class="tc-num" @dblclick="openModal(f,'fin','Av. Financiero',100)">
                  <div class="cell-field" :class="{ 'field-err': pending.has(f._i) && (f.fin<0||f.fin>100) }">
                    <input type="number" min="0" max="100" step="0.01" v-model.number="f.fin" @input="mark(f)" class="num-inp" />
                    <span class="unit">%</span>
                  </div>
                  <div class="bar"><div class="bar-fill bar-fin" :style="{width:Math.min(100,Math.max(0,f.fin))+'%'}"></div></div>
                </td>

                <!-- ESTABILIZADO -->
                <td class="tc-num" @dblclick="openModal(f,'est','Estabilizado', f.lkm||999)">
                  <div class="cell-field" :class="{ 'field-err': pending.has(f._i) && f.lkm>0 && f.est>f.lkm }">
                    <input type="number" min="0" :max="f.lkm||999999" step="0.01" v-model.number="f.est" @input="mark(f)" class="num-inp" />
                    <span class="unit">km</span>
                  </div>
                  <div v-if="f.lkm>0" class="bar"><div class="bar-fill bar-est" :style="{width:Math.min(100,(f.est/f.lkm)*100)+'%'}"></div></div>
                </td>
              </tr>
              <tr v-if="pending.has(f._i) && errs(f).length" class="r-err-detail">
                <td colspan="7">
                  <span v-for="e in errs(f)" :key="e" class="err-tag">⚠ {{ e }}</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Modal slider -->
      <Transition name="modal">
        <div v-if="modal" class="overlay" @click.self="closeModal">
          <div class="modal">
            <div class="modal-hdr">
              <div>
                <div class="modal-title">{{ modal.label }}</div>
                <div class="modal-sub">{{ modal.feat.cir }} · {{ modal.feat.via }}</div>
              </div>
              <button class="modal-close" @click="closeModal">✕</button>
            </div>
            <div class="modal-body">
              <div class="modal-num-row">
                <input type="number" :min="0" :max="modal.max" step="0.01" v-model.number="modalVal" class="modal-num-inp" />
                <span class="modal-unit">{{ modal.field === 'est' ? 'km' : '%' }}</span>
              </div>
              <input type="range" :min="0" :max="modal.max" step="0.01" v-model.number="modalVal" class="slider" />
              <div class="slider-labels">
                <span>0</span><span>{{ modal.max / 2 }}</span><span>{{ modal.max }}</span>
              </div>
              <div class="modal-preview">
                <div class="preview-bar">
                  <div class="preview-fill" :style="{width: Math.min(100, modal.max > 0 ? (modalVal/modal.max)*100 : 0)+'%'}"></div>
                </div>
                <span class="preview-pct">{{ modal.max > 0 ? ((modalVal/modal.max)*100).toFixed(1) : 0 }}%</span>
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn-cancel" @click="closeModal">Cancelar</button>
              <button class="btn-apply" @click="applyModal">Aplicar</button>
            </div>
          </div>
        </div>
      </Transition>

    </template>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0 }

.shell {
  height: 100vh; display: flex; flex-direction: column; overflow: hidden;
  background: #f0f4f1; font-family: 'Prompt', sans-serif; color: #1a2e20;
}

/* ── Login overlay ── */
.login-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: linear-gradient(135deg, #052318 0%, #0a4d38 60%, #1a7a56 100%);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.login-card {
  background: #fff; border-radius: 16px; padding: 36px 40px;
  width: 100%; max-width: 460px;
  box-shadow: 0 24px 60px rgba(0,0,0,.35);
  display: flex; flex-direction: column; gap: 14px; align-items: center;
}
.login-logo  { height: 52px; width: auto; margin-bottom: 4px }
.login-title { font-size: 17px; font-weight: 700; color: #0a4d38; text-align: center }
.login-sub   { font-size: 12px; color: #6b9e80; text-align: center; line-height: 1.5 }
.jwt-inp {
  width: 100%; background: #f5f9f6; border: 1.5px solid #c2d9cb;
  border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #1a2e20;
  font-family: monospace; resize: vertical; outline: none;
}
.jwt-inp:focus { border-color: #1a5c3a; box-shadow: 0 0 0 3px rgba(26,92,58,.1) }
.login-err { font-size: 11px; color: #b91c1c; align-self: flex-start }
.jwt-inp {
  width: 100%; background: #f5f9f6; border: 1.5px solid #c2d9cb;
  border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #1a2e20;
  font-family: monospace; resize: vertical; outline: none;
}
.jwt-inp:focus { border-color: #1a5c3a; box-shadow: 0 0 0 3px rgba(26,92,58,.1) }

/* Botón Continuar con Microsoft */
.btn-ms {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  width: 100%; padding: 11px 20px; border-radius: 9px;
  border: 1.5px solid #d1d5db; background: #fff;
  font-size: 14px; font-weight: 600; color: #1a1a1a;
  cursor: pointer; transition: background .15s, border-color .15s, box-shadow .15s;
  font-family: inherit;
}
.btn-ms:hover:not(:disabled) { background: #f3f4f6; border-color: #9ca3af; box-shadow: 0 2px 8px rgba(0,0,0,.08) }
.btn-ms:disabled { opacity: .6; cursor: not-allowed }

/* ── Header ── */
.hdr {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; height: 54px; flex-shrink: 0;
  background: #1a5c3a; border-bottom: 3px solid #0f3d27;
}
.hdr-l { display: flex; align-items: center; gap: 12px }
.hdr-logo  { height: 32px; width: auto }
.hdr-title { font-size: 13px; font-weight: 700; color: #fff; letter-spacing: .01em }
.hdr-sub   { font-size: 10px; color: rgba(255,255,255,.55); margin-top: 1px }
.hdr-r     { display: flex; align-items: center; gap: 10px }

.badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 99px }
.badge--warn { background: rgba(217,119,6,.15); border: 1px solid rgba(217,119,6,.4); color: #fde68a }
.badge--err  { background: rgba(185,28,28,.12); border: 1px solid rgba(185,28,28,.35); color: #fca5a5 }

.btn-save {
  padding: 7px 18px; border-radius: 7px; border: 1px solid #0f3d27;
  background: #0f3d27; color: #fff; font-family: 'Prompt', sans-serif;
  font-size: 12px; font-weight: 700; cursor: pointer; transition: background .15s;
}
.btn-save:hover:not(:disabled) { background: #0a2a1b }
.btn-save:disabled { opacity: .45; cursor: default }

.hdr-user {
  display: flex; align-items: center; gap: 8px;
  padding-left: 12px; border-left: 1px solid rgba(255,255,255,.2);
}
.hdr-user-info { display: flex; flex-direction: column; align-items: flex-end; gap: 1px }
.hdr-user-name  { font-size: 12px; font-weight: 700; color: #fff; line-height: 1.2 }
.hdr-user-email { font-size: 10px; color: rgba(255,255,255,.6); line-height: 1.2 }

.btn-logout {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 7px; border: 1px solid rgba(255,255,255,.25);
  background: rgba(255,255,255,.1); color: rgba(255,255,255,.7); cursor: pointer; transition: all .15s;
}
.btn-logout:hover { background: rgba(255,255,255,.2); color: #fff }
.btn-logout svg   { width: 15px; height: 15px }

/* ── Toast ── */
.toast {
  position: fixed; top: 64px; right: 20px; z-index: 999;
  padding: 10px 18px; border-radius: 8px; font-size: 12px; font-weight: 600;
  box-shadow: 0 4px 20px rgba(0,0,0,.18);
}
.toast--ok  { background: #1a5c3a; color: #fff }
.toast--err { background: #b91c1c; color: #fff }
.toast-enter-active, .toast-leave-active { transition: all .25s }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px) }

/* ── Filters ── */
.filters {
  display: flex; align-items: center; gap: 10px; padding: 10px 20px; flex-shrink: 0;
  background: #fff; border-bottom: 1px solid #d1e4d8; flex-wrap: wrap;
}
.search-wrap { position: relative; flex: 1; min-width: 200px }
.search-wrap svg { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; stroke: #6b9e80; pointer-events: none }
.inp {
  width: 100%; padding: 7px 8px 7px 30px;
  background: #f5f9f6; border: 1px solid #c2d9cb;
  border-radius: 7px; color: #1a2e20; font-family: 'Prompt', sans-serif; font-size: 12px; outline: none;
}
.inp:focus { border-color: #1a5c3a; box-shadow: 0 0 0 3px rgba(26,92,58,.1) }
.sel {
  padding: 7px 10px; background: #f5f9f6; border: 1px solid #c2d9cb;
  border-radius: 7px; color: #1a2e20; font-family: 'Prompt', sans-serif; font-size: 12px; outline: none; cursor: pointer;
}
.sel:focus { border-color: #1a5c3a }
.btn-clear {
  padding: 6px 12px; border-radius: 7px; border: 1px solid rgba(185,28,28,.25);
  background: rgba(185,28,28,.06); color: #b91c1c; font-family: 'Prompt', sans-serif;
  font-size: 11px; font-weight: 700; cursor: pointer;
}
.count { font-size: 11px; color: #6b9e80; font-weight: 600; white-space: nowrap }

/* ── Loading ── */
.loading { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #6b9e80 }
.spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid #c8e6d4; border-top-color: #1a5c3a; animation: spin .7s linear infinite }
@keyframes spin { to { transform: rotate(360deg) } }

/* ── Table ── */
.tbl-wrap { flex: 1; overflow: auto; padding: 0 20px 20px; background: #f0f4f1 }
.tbl-wrap::-webkit-scrollbar { width: 5px; height: 5px }
.tbl-wrap::-webkit-scrollbar-thumb { background: #a8c9b5; border-radius: 3px }

.tbl { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px }
.tbl thead th {
  position: sticky; top: 0; z-index: 5;
  background: #e8f0eb; color: #2e6649; font-size: 10px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase; padding: 9px 10px;
  border-bottom: 2px solid #c2d9cb; text-align: left; white-space: nowrap;
}
.tc-num { text-align: center }
.tbl tbody td { padding: 8px 10px; border-bottom: 1px solid #e0ece4; vertical-align: middle; background: #fff }
.tbl tbody tr:hover td { background: #f0f8f3 }
.r-changed td { background: #fffbeb !important }
.r-err td     { background: #fff5f5 !important }
.r-err-detail td { padding: 3px 10px 7px; background: #fff0f0; border-bottom: 1px solid #fecaca }
.err-tag { display: inline-flex; margin-right: 6px; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; background: #fee2e2; border: 1px solid #fca5a5; color: #b91c1c }

.cell-main { font-weight: 700; color: #1a2e20; font-size: 11px }
.cell-sec  { font-size: 10px; color: #6b9e80; margin-top: 1px }
.tc-mpio   { font-size: 11px; color: #3d6b50; font-weight: 600 }
.km-val    { font-weight: 700; color: #1a5c3a }
.pill { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 99px; background: #d4eddf; border: 1px solid #a8c9b5; color: #2e6649; white-space: nowrap }

.cell-field {
  display: inline-flex; align-items: center; gap: 3px;
  background: #f5f9f6; border: 1px solid #c2d9cb;
  border-radius: 6px; padding: 3px 7px; cursor: pointer; transition: border-color .15s;
}
.cell-field:hover { border-color: #1a5c3a; box-shadow: 0 0 0 2px rgba(26,92,58,.08) }
.cell-field.field-err { border-color: #fca5a5; background: #fff5f5 }
.num-inp { width: 58px; background: transparent; border: none; outline: none; color: #1a2e20; font-family: 'Prompt', sans-serif; font-size: 12px; font-weight: 700; text-align: right }
.num-inp::-webkit-inner-spin-button { opacity: .5 }
.unit { font-size: 10px; color: #6b9e80 }

.bar { height: 3px; background: #d4eddf; border-radius: 2px; margin-top: 4px; overflow: hidden }
.bar-fill { height: 100%; border-radius: 2px; transition: width .3s }
.bar-fis { background: #1a5c3a }
.bar-fin { background: #d97706 }
.bar-est { background: #2563eb }

/* ── Modal slider ── */
.overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(15,40,22,.45); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #fff; border: 1px solid #c2d9cb;
  border-radius: 14px; width: 380px; max-width: 95vw;
  box-shadow: 0 20px 60px rgba(26,92,58,.2);
}
.modal-hdr {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 18px 20px 14px; border-bottom: 1px solid #e0ece4;
  background: #1a5c3a; border-radius: 14px 14px 0 0;
}
.modal-title { font-size: 15px; font-weight: 700; color: #fff }
.modal-sub   { font-size: 10px; color: rgba(255,255,255,.6); margin-top: 3px }
.modal-close { background: rgba(255,255,255,.15); border: none; color: rgba(255,255,255,.7); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: background .15s }
.modal-close:hover { background: rgba(255,255,255,.3); color: #fff }
.modal-body { padding: 20px }
.modal-num-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px }
.modal-num-inp {
  width: 110px; text-align: center;
  background: #f5f9f6; border: 1px solid #c2d9cb;
  border-radius: 8px; color: #1a2e20; font-family: 'Prompt', sans-serif;
  font-size: 22px; font-weight: 700; padding: 10px; outline: none; transition: border-color .15s;
}
.modal-num-inp:focus { border-color: #1a5c3a; box-shadow: 0 0 0 3px rgba(26,92,58,.1) }
.modal-num-inp::-webkit-inner-spin-button { opacity: .5 }
.modal-unit { font-size: 16px; font-weight: 600; color: #6b9e80 }
.slider { width: 100%; height: 6px; appearance: none; background: #d4eddf; border-radius: 3px; outline: none; cursor: pointer; accent-color: #1a5c3a }
.slider::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #1a5c3a; border: 2px solid #fff; cursor: pointer; box-shadow: 0 2px 8px rgba(26,92,58,.35) }
.slider-labels { display: flex; justify-content: space-between; font-size: 10px; color: #6b9e80; margin-top: 5px; padding: 0 2px }
.modal-preview { display: flex; align-items: center; gap: 12px; margin-top: 18px }
.preview-bar { flex: 1; height: 8px; background: #e0ece4; border-radius: 4px; overflow: hidden }
.preview-fill { height: 100%; background: #1a5c3a; border-radius: 4px; transition: width .1s }
.preview-pct { font-size: 12px; font-weight: 700; color: #1a5c3a; min-width: 40px; text-align: right }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid #e0ece4 }
.btn-cancel { padding: 8px 18px; border-radius: 7px; border: 1px solid #c2d9cb; background: #f5f9f6; color: #3d6b50; font-family: 'Prompt', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer }
.btn-cancel:hover { background: #e8f0eb }
.btn-apply { padding: 8px 22px; border-radius: 7px; border: 1px solid #1a5c3a; background: #1a5c3a; color: #fff; font-family: 'Prompt', sans-serif; font-size: 12px; font-weight: 700; cursor: pointer }
.btn-apply:hover { background: #0f3d27 }
.modal-enter-active, .modal-leave-active { transition: all .2s }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(.95) }
</style>
