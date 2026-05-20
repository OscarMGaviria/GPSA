<script setup>
import { ref, computed, watch, defineAsyncComponent, onMounted, onUnmounted } from 'vue'
import { useCircuitoPhotos } from '../../composables/useCircuitoPhotos.js'
import { parseAvancePct, getBarColor, getStatusLabel, getStatusClass } from '../../utils/via.js'

const isInternal = import.meta.env.VITE_INTERNAL === 'true'
let GanttMiniView    = null
let CurvaSView       = null
let ValorGanadoView  = null
let ModuloResiliente = null
let EnsayosView      = null
let HitosView        = null
if (import.meta.env.VITE_INTERNAL === 'true') {
  GanttMiniView    = defineAsyncComponent(() => import('./GanttMiniView.vue'))
  CurvaSView       = defineAsyncComponent(() => import('./CurvaSView.vue'))
  ValorGanadoView  = defineAsyncComponent(() => import('./ValorGanadoView.vue'))
  ModuloResiliente = defineAsyncComponent(() => import('./ModuloResiliente.vue'))
  EnsayosView      = defineAsyncComponent(() => import('./EnsayosView.vue'))
  HitosView        = defineAsyncComponent(() => import('./HitosView.vue'))
}

const props = defineProps({ via: { type: Object, required: true } })
const emit  = defineEmits(['close'])

// ── Visibilidad con animación de salida ───────────────────────────────────
const visible = ref(true)
function requestClose() { visible.value = false }
function onAfterLeave() { emit('close') }

// ── Datos ────────────────────────────────────────────────────────────────────
const desc     = computed(() => props.via.description || {})
const circuito = computed(() => desc.value['Circuito'] ?? '')

const { photos } = useCircuitoPhotos(circuito)
const name   = computed(() => props.via.name || 'Tramo sin nombre')

const get = (...keys) => {
  for (const k of keys) if (desc.value[k]) return desc.value[k]
  return ''
}

const avancePct   = computed(() => parseAvancePct(desc.value))
const barColor    = computed(() => getBarColor(avancePct.value))
const statusLabel = computed(() => getStatusLabel(avancePct.value))
const statusClass = computed(() => getStatusClass(avancePct.value))

// Orden de la tabla
const TABLE_FIELDS = [
  'Subregión', 'Municipio', 'Circuito',
  'Código de vía', 'Contrato', 'Contratista', 'Interventoría',
  'Longitud (km)',
  'Fecha de inicio', 'Plazo (meses)', 'Duración transcurrida',
  'Avance físico',
]
const tableRows = computed(() => {
  const used = new Set()
  const rows = []
  for (const k of TABLE_FIELDS) {
    if (desc.value[k]) { rows.push([k, desc.value[k]]); used.add(k) }
  }
  for (const [k, v] of Object.entries(desc.value)) {
    if (!used.has(k)) rows.push([k, v])
  }
  return rows
})

// ── Galería ───────────────────────────────────────────────────────────────────
const PHASES = [
  { key: 'antes',   label: 'Antes' },
  { key: 'durante', label: 'Durante' },
  { key: 'despues', label: 'Después' },
]

const brokenUrls = ref(new Set())
watch(circuito, () => { brokenUrls.value = new Set() })

function onImgError(e) {
  const url = e.target?.src || e.target?.currentSrc
  if (url) brokenUrls.value = new Set([...brokenUrls.value, url])
}

function goodUrls(list) {
  return (list || []).filter(u => !brokenUrls.value.has(u))
}

// Lista plana: todas las fotos de las tres etapas con su etiqueta
const allPhotos = computed(() => {
  const result = []
  for (const ph of PHASES) {
    for (const url of goodUrls(photos.value[ph.key])) {
      result.push({ url, key: ph.key, label: ph.label })
    }
  }
  return result
})

const hasPhotos = computed(() => allPhotos.value.length > 0)
const activeIdx = ref(0)

let _autoTimer = null

function resetAuto() {
  if (_autoTimer) { clearInterval(_autoTimer); _autoTimer = null }
  if (allPhotos.value.length > 1) {
    _autoTimer = setInterval(() => {
      activeIdx.value = (activeIdx.value + 1) % allPhotos.value.length
    }, 2000)
  }
}

watch(allPhotos, () => { activeIdx.value = 0; resetAuto() })

function pauseAuto() { if (_autoTimer) { clearInterval(_autoTimer); _autoTimer = null } }
function resumeAuto() { resetAuto() }

const prev = () => { activeIdx.value = (activeIdx.value - 1 + allPhotos.value.length) % allPhotos.value.length; resetAuto() }
const next = () => { activeIdx.value = (activeIdx.value + 1) % allPhotos.value.length; resetAuto() }

// ── Animación barra avance + count-up % ──────────────────────────────────────
const barVisible  = ref(false)
const displayPct  = ref(0)
let   barTimer    = null

function countUpPct(target) {
  const dur = 700, s = performance.now()
  ;(function step(now) {
    const t = Math.min((now - s) / dur, 1)
    displayPct.value = Math.round(target * (1 - Math.pow(1 - t, 3)))
    if (t < 1) requestAnimationFrame(step)
    else displayPct.value = target
  }(performance.now()))
}

// ── Main tabs: detalle | cronograma ─────────────────────────────────────────
const mainTab = ref('detalle')
function setMainTab(tab) { mainTab.value = tab }

// ── Lightbox ─────────────────────────────────────────────────────────────────
const lightboxOpen = ref(false)
function openLightbox()  { lightboxOpen.value = true;  pauseAuto() }
function closeLightbox() { lightboxOpen.value = false; resumeAuto() }

// ── Keyboard / scroll lock ────────────────────────────────────────────────────
const onKey = (e) => {
  if (e.key === 'Escape') {
    if (lightboxOpen.value) { closeLightbox(); return }
    requestClose()
  }
  if (e.key === 'ArrowLeft')  prev()
  if (e.key === 'ArrowRight') next()
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
  barTimer = setTimeout(() => {
    barVisible.value = true
    countUpPct(avancePct.value)
  }, 280)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
  clearTimeout(barTimer)
  if (_autoTimer) clearInterval(_autoTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-anim" @after-leave="onAfterLeave">
    <div v-if="visible" class="backdrop" @click.self="requestClose">
      <div class="modal" role="dialog" aria-modal="true">

        <!-- ── HEADER ── -->
        <header class="mhead">
          <div class="mhead-content">
            <span class="mhead-inst">Gobernación de Antioquia · Secretaría de Infraestructura Física</span>
            <h2 class="mhead-name">{{ name }}</h2>
            <div class="mhead-chips">
              <span v-if="get('Municipio')" class="mhead-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {{ get('Municipio') }}
              </span>
              <span v-if="get('Longitud (km)')" class="mhead-chip">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
                {{ get('Longitud (km)') }} km
              </span>
              <span v-if="avancePct > 0" class="mhead-chip mhead-chip--green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ avancePct }}% ejecutado
              </span>
            </div>
          </div>
          <button class="btn-x" @click="requestClose" aria-label="Cerrar">✕</button>
        </header>

        <!-- ── MAIN TABS (internal only) ── -->
        <nav v-if="isInternal" class="main-tabs">
          <button class="main-tab" :class="{ 'is-active': mainTab === 'detalle' }" @click="setMainTab('detalle')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Detalle
          </button>
          <button class="main-tab" :class="{ 'is-active': mainTab === 'cronograma' }" @click="setMainTab('cronograma')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Cronograma
          </button>
          <button class="main-tab" :class="{ 'is-active': mainTab === 'curvas' }" @click="setMainTab('curvas')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Curva S
          </button>
          <button class="main-tab" :class="{ 'is-active': mainTab === 'valor-ganado' }" @click="setMainTab('valor-ganado')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Valor Ganado
          </button>
          <button class="main-tab" :class="{ 'is-active': mainTab === 'modulo' }" @click="setMainTab('modulo')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M5 20V10l7-7 7 7v10"/></svg>
            Mód. Resiliente
          </button>
          <button class="main-tab" :class="{ 'is-active': mainTab === 'ensayos' }" @click="setMainTab('ensayos')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Ensayos Lab.
          </button>
          <button class="main-tab" :class="{ 'is-active': mainTab === 'hitos' }" @click="setMainTab('hitos')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
            Campo
          </button>
        </nav>

        <!-- ── CRONOGRAMA FULL WIDTH ── -->
        <div v-if="isInternal && mainTab === 'cronograma'" class="cronograma-full">
          <component :is="GanttMiniView" :circuito="circuito" />
        </div>

        <!-- ── CURVA S ── -->
        <div v-if="isInternal && mainTab === 'curvas'" class="cronograma-full">
          <component :is="CurvaSView" :circuito="circuito" />
        </div>

        <!-- ── VALOR GANADO ── -->
        <div v-if="isInternal && mainTab === 'valor-ganado'" class="cronograma-full">
          <component :is="ValorGanadoView" :circuito="circuito" />
        </div>

        <!-- ── MÓDULO RESILIENTE ── -->
        <div v-if="isInternal && mainTab === 'modulo'" class="cronograma-full">
          <component :is="ModuloResiliente" :circuito="circuito" />
        </div>

        <!-- ── ENSAYOS DE LABORATORIO ── -->
        <div v-if="isInternal && mainTab === 'ensayos'" class="cronograma-full">
          <component :is="EnsayosView" :circuito="circuito" />
        </div>

        <!-- ── HITOS / SEGUIMIENTO DE CAMPO ── -->
        <div v-if="isInternal && mainTab === 'hitos'" class="cronograma-full">
          <component :is="HitosView" :circuito="circuito" />
        </div>

        <!-- ── TWO COLUMNS ── -->
        <div v-if="mainTab === 'detalle'" class="mcols">

          <!-- LEFT: datos -->
          <div class="col-left">

            <!-- Avance -->
            <div class="block">
              <div class="block-header">
                <span class="block-label">Avance de obra</span>
                <span class="status-pill" :class="statusClass">{{ statusLabel }}</span>
              </div>
              <div class="avance-pct-row">
                <span class="avance-pct">{{ barVisible ? displayPct : 0 }}<span class="avance-sym">%</span></span>
              </div>
              <div class="bar-wrap">
                <div class="bar-track">
                  <div class="bar-fill" :style="{ transform: 'scaleX(' + (barVisible ? avancePct / 100 : 0) + ')', background: barColor }" />
                </div>
                <div class="bar-ticks">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>
            </div>

            <div class="divider" />

            <!-- Información del tramo -->
            <div class="block block--table">
              <p class="block-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Información del tramo
              </p>
              <table class="info-tbl">
                <tbody>
                  <tr v-for="([k, v], idx) in tableRows" :key="k"
                      :style="{ animationDelay: (300 + idx * 35) + 'ms' }">
                    <td class="td-key">{{ k }}</td>
                    <td class="td-val" :class="{ 'td-val--bold': k === 'Contratista' }">{{ v }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          <!-- RIGHT: fotos -->
          <div class="col-right">
            <div class="block block--full">
              <p class="block-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Registro fotográfico
              </p>

              <template v-if="hasPhotos">
                <div class="phase-wrap" @mouseenter="pauseAuto" @mouseleave="resumeAuto">
                  <div class="photo-stage" @click="openLightbox">
                    <Transition name="photo-cross" mode="out-in">
                      <img
                        :key="activeIdx"
                        :src="allPhotos[activeIdx].url"
                        :alt="`${allPhotos[activeIdx].label} ${activeIdx + 1}`"
                        class="photo-img"
                        decoding="async"
                        @error="onImgError"
                      />
                    </Transition>
                    <span class="photo-watermark" :data-phase="allPhotos[activeIdx].key">
                      {{ allPhotos[activeIdx].label }}
                    </span>
                    <button v-if="allPhotos.length > 1" class="pnav pnav--l" @click.stop="prev" aria-label="Anterior">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <button v-if="allPhotos.length > 1" class="pnav pnav--r" @click.stop="next" aria-label="Siguiente">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                    <span class="photo-ctr">{{ activeIdx + 1 }} / {{ allPhotos.length }}</span>
                    <button class="photo-expand-btn" @click.stop="openLightbox" aria-label="Ampliar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    </button>
                  </div>
                </div>

                <div v-if="allPhotos.length > 1" class="thumbs">
                  <button
                    v-for="(photo, i) in allPhotos" :key="i"
                    class="thumb"
                    :class="{ 'is-active': i === activeIdx }"
                    @click="activeIdx = i; resetAuto()"
                  >
                    <img :src="photo.url" :alt="`miniatura ${i + 1}`" loading="lazy" decoding="async" @error="onImgError" />
                  </button>
                </div>
              </template>

              <div v-else class="no-photos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <p>Sin registro fotográfico</p>
              </div>
            </div>
          </div>

        </div>

        <!-- ── FOOTER ── -->
        <footer class="mfoot">
          <span class="mfoot-brand">Sistema de Seguimiento — Red Vial Departamental</span>
          <button class="btn-cerrar" @click="requestClose">Cerrar</button>
        </footer>

      </div>
    </div>
    </Transition>

    <!-- ── LIGHTBOX ── -->
    <Transition name="lb-anim">
      <div v-if="lightboxOpen" class="lb-backdrop" @click.self="closeLightbox">
        <div class="lb-wrap">
          <Transition name="lb-photo" mode="out-in">
            <img
              :key="activeIdx"
              :src="allPhotos[activeIdx].url"
              :alt="`${allPhotos[activeIdx].label} ${activeIdx + 1}`"
              class="lb-img"
              @error="onImgError"
            />
          </Transition>
          <span class="lb-watermark" :data-phase="allPhotos[activeIdx].key">
            {{ allPhotos[activeIdx].label }}
          </span>
          <button v-if="allPhotos.length > 1" class="lb-nav lb-nav--l" @click="prev" aria-label="Anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button v-if="allPhotos.length > 1" class="lb-nav lb-nav--r" @click="next" aria-label="Siguiente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <span class="lb-ctr">{{ activeIdx + 1 }} / {{ allPhotos.length }}</span>
          <button class="lb-close" @click="closeLightbox" aria-label="Cerrar">✕</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ── */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(5, 20, 12, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* ── Transición entrada/salida ── */
.modal-anim-enter-active {
  transition: opacity 0.2s ease;
}
.modal-anim-leave-active {
  transition: opacity 0.18s ease;
}
.modal-anim-enter-from,
.modal-anim-leave-to {
  opacity: 0;
}
.modal-anim-enter-active .modal {
  transition: opacity 0.26s ease, transform 0.26s cubic-bezier(0.34, 1.1, 0.64, 1);
}
.modal-anim-leave-active .modal {
  transition: opacity 0.16s ease, transform 0.16s cubic-bezier(0.4, 0, 1, 1);
}
.modal-anim-enter-from .modal,
.modal-anim-leave-to .modal {
  opacity: 0;
  transform: translateY(22px) scale(0.97);
}

/* ── Modal shell ── */
.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: min(95vw, 1280px);
  height: 88vh;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 40px 80px rgba(0,0,0,.28),
    0 8px 24px rgba(0,0,0,.16);
  overflow: hidden;
}

/* ── Header ── */
.mhead {
  background: linear-gradient(110deg, #052318 0%, #0a4d38 45%, #0d6347 75%, #1a7a56 100%);
  padding: 14px 18px 14px 22px;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.mhead::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 110% 50%, rgba(63,173,114,.35) 0%, transparent 50%),
    radial-gradient(ellipse at -10% 80%, rgba(5,35,24,.6) 0%, transparent 50%);
  pointer-events: none;
}
.mhead::after {
  content: '';
  position: absolute;
  right: -30px; top: -30px;
  width: 160px; height: 160px;
  border-radius: 50%;
  border: 28px solid rgba(255,255,255,.04);
  pointer-events: none;
}
.mhead-content { flex: 1; min-width: 0; position: relative; }
.mhead-inst {
  display: block;
  margin: 0 0 4px;
  font-family: 'Prompt', sans-serif;
  font-size: 9px;
  font-weight: 600;
  color: rgba(255,255,255,.4);
  letter-spacing: .1em;
  text-transform: uppercase;
}
.mhead-name {
  margin: 0 0 8px;
  font-family: 'Prompt', sans-serif;
  font-size: 17px;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
  letter-spacing: -.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mhead-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.mhead-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px 3px 7px;
  border-radius: 99px;
  background: rgba(255,255,255,.12);
  border: 1px solid rgba(255,255,255,.18);
  font-family: 'Prompt', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,.85);
  backdrop-filter: blur(4px);
  white-space: nowrap;
}
.mhead-chip svg { width: 10px; height: 10px; flex-shrink: 0; opacity: .75; }
.mhead-chip--green {
  background: rgba(63,173,114,.25);
  border-color: rgba(63,173,114,.45);
  color: #a7f3d0;
}
.btn-x {
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid rgba(255,255,255,.25);
  border-radius: 8px;
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.75);
  font-size: 17px;
  font-weight: 400;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  transition: background .15s ease-out, border-color .15s ease-out, color .15s ease-out, transform .1s ease-out;
}
.btn-x:focus { outline: none; }
.btn-x:active { transform: scale(0.93); }
@media (hover: hover) and (pointer: fine) {
  .btn-x:hover { background: rgba(255,255,255,.2); border-color: rgba(255,255,255,.55); color: #fff; }
}

/* ── Main tabs ── */
.main-tabs {
  display: flex;
  gap: 2px;
  padding: 10px 24px 0;
  background: #fff;
  border-bottom: 2px solid #f0f4f2;
  flex-shrink: 0;
}
.main-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px 11px;
  border: none;
  background: transparent;
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #9ca3af;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  border-radius: 8px 8px 0 0;
  transition: color .15s ease-out, border-color .15s ease-out, background .12s ease-out;
}
.main-tab svg { width: 14px; height: 14px; flex-shrink: 0; }
.main-tab:focus { outline: none; }
@media (hover: hover) and (pointer: fine) {
  .main-tab:hover:not(.is-active) { color: #374151; background: #f9fafb; }
}
.main-tab.is-active { color: #0b5640; border-bottom-color: #0b5640; }

/* ── Cronograma full-width panel ── */
.cronograma-full {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  overflow: hidden;
}

/* ── Two columns ── */
.mcols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── Left column ── */
.col-left {
  border-right: 1px solid #f0f0f0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}
.col-left::-webkit-scrollbar       { width: 4px; }
.col-left::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }

/* ── Right column ── */
.col-right {
  overflow: hidden;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

/* ── Block ── */
.block {
  padding: 18px 20px;
}
.block--table { padding-top: 0; }
.block--full  { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.block-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px;
  font-family: 'Prompt', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #9ca3af;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.block-label svg { width: 13px; height: 13px; flex-shrink: 0; }

.divider { height: 1px; background: #f3f4f6; margin: 0 20px; }

/* ── Status pill ── */
.status-pill {
  font-family: 'Prompt', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .05em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}
.pill--active  { background: #d1fae5; color: #065f46; }
.pill--done    { background: #bbf7d0; color: #14532d; }
.pill--pending { background: #f3f4f6; color: #9ca3af; }

/* ── Avance ── */
.avance-pct-row {
  margin-bottom: 10px;
}
.avance-pct {
  font-family: 'Prompt', sans-serif;
  font-size: 38px;
  font-weight: 900;
  color: #0b5640;
  line-height: 1;
}
.avance-sym {
  font-size: 20px;
  font-weight: 700;
  margin-left: 2px;
}
.bar-wrap { width: 100%; }
.bar-track {
  width: 100%;
  height: 9px;
  background: #f3f4f6;
  border-radius: 99px;
  overflow: hidden;
}
.bar-fill {
  width: 100%;
  height: 100%;
  border-radius: 99px;
  transform-origin: left;
}
.bar-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-family: 'Prompt', sans-serif;
  font-size: 9.5px;
  color: #d1d5db;
  font-weight: 500;
}

/* ── Info table ── */
.info-tbl {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Prompt', sans-serif;
}
.info-tbl tr { border-bottom: 1px solid #f9fafb; }
.info-tbl tr:last-child { border-bottom: none; }
.td-key {
  padding: 7.5px 14px 7.5px 0;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
  white-space: nowrap;
  vertical-align: top;
  width: 46%;
}
.td-val {
  padding: 7.5px 0;
  font-size: 12.5px;
  color: #1f2937;
  font-weight: 600;
  word-break: break-word;
}
.td-val--bold { color: #0b5640; font-weight: 800; font-size: 13px; }

/* ── Marca de agua de etapa ── */
.photo-watermark {
  position: absolute;
  top: 10px; right: 10px;
  padding: 3px 11px;
  border-radius: 20px;
  font-family: 'Prompt', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: #fff;
  backdrop-filter: blur(6px);
  pointer-events: none;
  user-select: none;
  transition: background .25s ease-out;
}
.photo-watermark[data-phase="antes"]   { background: rgba(59,130,246,.82); }
.photo-watermark[data-phase="durante"] { background: rgba(245,158,11,.82); }
.photo-watermark[data-phase="despues"] { background: rgba(16,185,129,.82); }

/* ── Bar fill animación ── */
.bar-fill {
  transition: transform 0.7s cubic-bezier(0.23, 1, 0.32, 1);
}

/* ── Stagger filas info ── */
@keyframes rowSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}
.info-tbl tr {
  animation: rowSlideIn 0.22s ease-out both;
}

/* ── Photo wrapper — ocupa el espacio disponible ── */
.phase-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  border-radius: 10px;
  overflow: hidden;
}

/* ── Photo viewer ── */
.photo-stage {
  position: absolute;
  inset: 0;
  background: #0d0d0d;
  overflow: hidden;
  cursor: zoom-in;
}
.photo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* ── Botón ampliar (aparece al hover) ── */
.photo-expand-btn {
  position: absolute;
  bottom: 8px; left: 10px;
  width: 28px; height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(0,0,0,.5);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity .18s ease-out, background .14s ease-out;
}
.photo-expand-btn svg { width: 13px; height: 13px; }
.photo-stage:hover .photo-expand-btn { opacity: 1; }
@media (hover: hover) and (pointer: fine) {
  .photo-expand-btn:hover { background: rgba(0,0,0,.75); }
}

/* ── Transición zoom+fade entre fotos ── */
.photo-cross-enter-active {
  transition: opacity 0.38s ease-out, transform 0.38s cubic-bezier(0.23, 1, 0.32, 1);
}
.photo-cross-leave-active {
  position: absolute; inset: 0;
  transition: opacity 0.22s ease-out, transform 0.22s ease-in;
}
.photo-cross-enter-from { opacity: 0; transform: scale(1.045); }
.photo-cross-leave-to   { opacity: 0; transform: scale(0.96); }


.pnav {
  position: absolute;
  top: 50%; transform: translateY(-50%);
  width: 32px; height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,.45);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background .14s ease-out, transform .1s ease-out;
}
.pnav:active { transform: translateY(-50%) scale(0.96); }
@media (hover: hover) and (pointer: fine) {
  .pnav:hover { background: rgba(0,0,0,.68); }
}
.pnav svg   { width: 14px; height: 14px; }
.pnav--l    { left: 9px; }
.pnav--r    { right: 9px; }
.photo-ctr {
  position: absolute;
  bottom: 8px; right: 10px;
  background: rgba(0,0,0,.5);
  color: #fff;
  font-family: 'Prompt', sans-serif;
  font-size: 10.5px; font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

/* ── Thumbnails ── */
.thumbs {
  display: flex;
  gap: 7px;
  margin-top: 9px;
  overflow-x: auto;
  padding-bottom: 2px;
  flex-shrink: 0;
}
.thumbs::-webkit-scrollbar       { height: 3px; }
.thumbs::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
.thumb {
  width: 66px; height: 48px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  opacity: .55;
  transition: border-color .14s, opacity .14s;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb.is-active { border-color: #0b5640; opacity: 1; }
.thumb:hover:not(.is-active) { opacity: .82; border-color: #9ca3af; }

/* ── Gantt embed ── */
.gantt-embed {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── Empty state ── */
.no-photos {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #d1d5db;
  padding: 40px 20px;
}
.no-photos svg { width: 40px; height: 40px; }
.no-photos p {
  margin: 0;
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  color: #c4c9d2;
}

/* ── Lightbox ── */
.lb-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0,0,0,.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.lb-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  max-width: 1400px;
}
.lb-img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
  display: block;
  user-select: none;
}
.lb-watermark {
  position: absolute;
  top: 16px; right: 56px;
  padding: 4px 13px;
  border-radius: 20px;
  font-family: 'Prompt', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: #fff;
  backdrop-filter: blur(8px);
  pointer-events: none;
}
.lb-watermark[data-phase="antes"]   { background: rgba(59,130,246,.85); }
.lb-watermark[data-phase="durante"] { background: rgba(245,158,11,.85); }
.lb-watermark[data-phase="despues"] { background: rgba(16,185,129,.85); }
.lb-nav {
  position: absolute;
  top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,.12);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background .14s ease-out, transform .1s ease-out;
}
.lb-nav:active { transform: translateY(-50%) scale(0.94); }
@media (hover: hover) and (pointer: fine) {
  .lb-nav:hover { background: rgba(255,255,255,.25); }
}
.lb-nav svg  { width: 18px; height: 18px; }
.lb-nav--l   { left: 12px; }
.lb-nav--r   { right: 12px; }
.lb-ctr {
  position: absolute;
  bottom: 16px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,.55);
  color: #fff;
  font-family: 'Prompt', sans-serif;
  font-size: 12px; font-weight: 600;
  padding: 3px 12px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
  white-space: nowrap;
}
.lb-close {
  position: absolute;
  top: 12px; right: 12px;
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,.25);
  background: rgba(0,0,0,.4);
  color: rgba(255,255,255,.8);
  font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background .14s ease-out, color .14s ease-out;
}
@media (hover: hover) and (pointer: fine) {
  .lb-close:hover { background: rgba(255,255,255,.15); color: #fff; }
}

/* ── Transiciones lightbox ── */
.lb-anim-enter-active { transition: opacity 0.2s ease-out; }
.lb-anim-leave-active { transition: opacity 0.15s ease-out; }
.lb-anim-enter-from, .lb-anim-leave-to { opacity: 0; }
.lb-photo-enter-active {
  transition: opacity 0.32s ease-out, transform 0.32s cubic-bezier(0.23, 1, 0.32, 1);
}
.lb-photo-leave-active {
  position: absolute;
  transition: opacity 0.18s ease-out;
}
.lb-photo-enter-from { opacity: 0; transform: scale(0.96); }
.lb-photo-leave-to   { opacity: 0; }

/* ── Footer ── */
.mfoot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #f9fafb;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.mfoot-brand {
  font-family: 'Prompt', sans-serif;
  font-size: 10.5px;
  color: #b0b7c3;
}
.btn-cerrar {
  padding: 7px 22px;
  border-radius: 8px;
  border: none;
  background: #0b5640;
  color: #fff;
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background .14s ease-out, transform .1s ease-out;
}
.btn-cerrar:active { transform: scale(0.97); }
@media (hover: hover) and (pointer: fine) {
  .btn-cerrar:hover { background: #2d8653; }
}
@media (prefers-reduced-motion: reduce) {
  .modal-anim-enter-active,
  .modal-anim-leave-active,
  .modal-anim-enter-active .modal,
  .modal-anim-leave-active .modal { transition: none; }
  .btn-x:active,
  .btn-cerrar:active { transform: none; }
  .pnav:active { transform: translateY(-50%); }
  .bar-fill { transition: none; }
  .info-tbl tr { animation: none; }
  .photo-cross-enter-active,
  .photo-cross-leave-active,
  .lb-anim-enter-active,
  .lb-anim-leave-active,
  .lb-photo-enter-active,
  .lb-photo-leave-active { transition: none; }
  @keyframes rowSlideIn { from { opacity: 1; transform: none; } }
}
</style>
