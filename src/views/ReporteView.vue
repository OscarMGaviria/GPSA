<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { PageFlip } from 'page-flip'
import { useMapStore } from '../stores/useMapStore.js'
import { buildReportePages, buildPresentacionSlides, CSS, useReporte } from '../composables/useReporte.js'

const router  = useRouter()
const store   = useMapStore()
const { activeFilters, filteredStats } = storeToRefs(store)
const { generarReporte } = useReporte()

// A4 @ 96dpi — scale down to fit viewport
const A4W  = 794
const A4H  = 1123
const PG_W = 440
const PG_H = Math.round(A4H * PG_W / A4W)
const SCALE = PG_W / A4W

const bookEl      = ref(null)
const stageEl     = ref(null)
const currentPg   = ref(0)
const totalPgs    = ref(0)
const geoFeatures = ref([])
const ready       = ref(false)
const loadMsg     = ref('Cargando datos…')

// ── Zoom + Pan ──────────────────────────────────────────────────────────────
const zoom        = ref(1)
const ZOOM_MIN    = 0.5
const ZOOM_MAX    = 2.0
const ZOOM_STEP   = 0.08
const zoomPct     = computed(() => Math.round(zoom.value * 100))
const showZoomBadge = ref(false)
let zoomBadgeTimer = null

// Pan (arrastrar con click sostenido cuando hay zoom)
const panX = ref(0)
const panY = ref(0)
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0
let panOriginX = 0
let panOriginY = 0

const isZoomed = computed(() => zoom.value > 1.02)
const zoomCursor = computed(() => {
  if (!isZoomed.value) return 'default'
  return isPanning.value ? 'grabbing' : 'grab'
})
const zoomTransform = computed(() =>
  `scale(${zoom.value}) translate(${panX.value}px, ${panY.value}px)`
)

function applyZoom(delta) {
  zoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.value + delta))
  if (zoom.value <= 1.02) { panX.value = 0; panY.value = 0 }
  showZoomBadge.value = true
  clearTimeout(zoomBadgeTimer)
  zoomBadgeTimer = setTimeout(() => { showZoomBadge.value = false }, 1200)
}
function resetZoom() {
  zoom.value = 1; panX.value = 0; panY.value = 0
  showZoomBadge.value = false
}

// Pan: solo cuando hay zoom. Se captura en un overlay para no interferir con PageFlip
function onPanStart(e) {
  if (!isZoomed.value) return
  if (e.button !== 0) return
  isPanning.value = true
  panStartX = e.clientX
  panStartY = e.clientY
  panOriginX = panX.value
  panOriginY = panY.value
  e.preventDefault()
  e.stopPropagation()
}
function onPanMove(e) {
  if (!isPanning.value) return
  panX.value = panOriginX + (e.clientX - panStartX) / zoom.value
  panY.value = panOriginY + (e.clientY - panStartY) / zoom.value
  e.preventDefault()
}
function onPanEnd() {
  isPanning.value = false
}

// Doble clic en overlay: pasar página (izquierda=prev, derecha=next)
function onOverlayDblClick(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const half = rect.left + rect.width / 2
  if (e.clientX < half) prev()
  else next()
}

// Scroll simple = zoom (sin Ctrl)
function onWheel(e) {
  if (!ready.value) return
  // En modo presentación no hacer zoom
  if (pptMode.value) return
  e.preventDefault()
  applyZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)
}

const logoUrl = window.location.origin + '/Escudo%20de%20armas.png'
const fecha   = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })

// ── Modo presentación ────────────────────────────────────────────────────────
const pptMode   = ref(false)
const pptIdx    = ref(0)
const slideDir  = ref('next')   // 'next' | 'prev' — controls transition direction

const SLIDE_W   = 1280
const SLIDE_H   = 720
const pptDispW  = ref(960)
const pptScale  = computed(() => pptDispW.value / SLIDE_W)
const pptDispH  = computed(() => Math.round(SLIDE_H * pptScale.value))

function computePptScale() {
  const availW = window.innerWidth  - 140
  const availH = window.innerHeight - 50 - 46 - 28
  const s = Math.min(availW / SLIDE_W, availH / SLIDE_H)
  pptDispW.value = Math.round(SLIDE_W * Math.max(0.3, s))
}

const pptSlides = computed(() =>
  buildPresentacionSlides(filteredStats.value, activeFilters.value, logoUrl, fecha, geoFeatures.value)
)
const pptTotal  = computed(() => pptSlides.value.length)
const pptFirst  = computed(() => pptIdx.value === 0)
const pptLast   = computed(() => pptIdx.value >= pptTotal.value - 1)

function pptPrev() {
  if (pptIdx.value > 0) { slideDir.value = 'prev'; pptIdx.value-- }
}
function pptNext() {
  if (pptIdx.value < pptTotal.value - 1) { slideDir.value = 'next'; pptIdx.value++ }
}
function pptGoTo(i) {
  slideDir.value = i > pptIdx.value ? 'next' : 'prev'
  pptIdx.value = i
}

function togglePptMode() {
  pptMode.value = !pptMode.value
  if (pptMode.value) {
    pptIdx.value  = 0
    slideDir.value = 'next'
    nextTick(() => computePptScale())
  }
}

const BLANK_PAGE = `<div class="page" style="background:linear-gradient(160deg,#0c1a12 0%,#132b1c 100%);width:210mm;min-height:297mm"></div>`

const pages = computed(() => [
  BLANK_PAGE,
  ...buildReportePages(filteredStats.value, activeFilters.value, logoUrl, fecha, geoFeatures.value).map(p => p.html),
])

let styleEl = null
function injectCss() {
  if (document.getElementById('rpt-viewer-css')) return
  styleEl = document.createElement('style')
  styleEl.id = 'rpt-viewer-css'
  styleEl.textContent = CSS
    .replace(/@page\s*[^{]*\{[^}]*\}/g, '')
    .replace(/@media\s+print\s*\{[\s\S]*?\n\}/g, '')
  document.head.appendChild(styleEl)
}

let pf = null

onMounted(async () => {
  // ── Paso 1: fetch GeoJSON y CSS en paralelo ──────────────────────────────
  loadMsg.value = 'Preparando informe…'
  const [geoResult] = await Promise.allSettled([
    fetch('/data/localizacion.geojson').then(r => r.json()),
  ])
  if (geoResult.status === 'fulfilled') {
    geoFeatures.value = geoResult.value.features ?? []
  }
  injectCss()

  // ── Paso 2: dejar que Vue renderice las páginas ──────────────────────────
  loadMsg.value = 'Construyendo páginas…'
  await nextTick()
  await nextTick() // doble tick para asegurar que el DOM esté pintado

  // ── Paso 3: inicializar PageFlip en el siguiente frame disponible ────────
  loadMsg.value = 'Iniciando visor…'
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

  pf = new PageFlip(bookEl.value, {
    width:               PG_W,
    height:              PG_H,
    size:                'fixed',
    showCover:           false,
    usePortrait:         false,
    drawShadow:          true,
    maxShadowOpacity:    0.3,
    flippingTime:        380,
    useMouseEvents:      true,
    swipeDistance:       30,
    mobileScrollSupport: false,
    startZIndex:         5,
    startPage:           0,
  })

  pf.loadFromHTML(bookEl.value.querySelectorAll('.rp-page'))
  pf.on('flip',        () => { currentPg.value = pf.getCurrentPageIndex() })
  pf.on('changeState', () => { currentPg.value = pf.getCurrentPageIndex() })
  totalPgs.value = pf.getPageCount()

  // ── Paso 4: fade-in suave ────────────────────────────────────────────────
  await new Promise(resolve => requestAnimationFrame(resolve))
  ready.value = true
})

onUnmounted(() => {
  pf?.destroy()
  styleEl?.remove()
})

function prev()  { pf?.flipPrev('top') }
function next()  { pf?.flipNext('top') }
function goTo(i) { pf?.flip(i, 'top') }

function onKey(e) {
  if (pptMode.value) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') pptNext()
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   pptPrev()
    if (e.key === 'Escape') togglePptMode()
    return
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev()
  if (e.key === 'Escape') router.back()
  if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); applyZoom(ZOOM_STEP) }
  if ((e.ctrlKey || e.metaKey) && e.key === '-')                     { e.preventDefault(); applyZoom(-ZOOM_STEP) }
  if ((e.ctrlKey || e.metaKey) && e.key === '0')                     { e.preventDefault(); resetZoom() }
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  // passive:false necesario para poder llamar preventDefault en wheel
  window.addEventListener('wheel', onWheel, { passive: false })
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('wheel', onWheel)
})

const pageLabel = computed(() => {
  const p = currentPg.value
  if (p <= 1) return 'Portada'
  const left  = p
  const right = p + 1
  const total = totalPgs.value - 1
  return `${left} — ${right}  /  ${total}`
})

const isFirst = computed(() => currentPg.value === 0)
const isLast  = computed(() => currentPg.value >= totalPgs.value - 1)
const dotPages = computed(() => pages.value.slice(1))
</script>

<template>
  <div class="rv-shell">

    <!-- ── Top bar ── -->
    <div class="rv-bar">
      <button class="rv-btn" @click="router.back()">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5l-7 5 7 5"/></svg>
        Volver al mapa
      </button>

      <div class="rv-bar-center">
        <span class="rv-bar-title">Reporte Gerencial — SIMEVA</span>
        <span class="rv-bar-tag"
          v-if="activeFilters.circuito !== 'Todos los circuitos'">{{ activeFilters.circuito }}</span>
        <span class="rv-bar-tag"
          v-else-if="activeFilters.subregion !== 'Todas las subregiones'">{{ activeFilters.subregion }}</span>
      </div>

      <!-- Controles de zoom -->
      <div class="rv-zoom-ctrl" v-if="ready">
        <button class="rv-zoom-btn" @click="applyZoom(-ZOOM_STEP)" :disabled="zoom <= ZOOM_MIN" title="Alejar (Ctrl −)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="4" y1="10" x2="16" y2="10"/></svg>
        </button>
        <span class="rv-zoom-lbl" @dblclick="resetZoom" title="Doble clic para restablecer">{{ zoomPct }}%</span>
        <button class="rv-zoom-btn" @click="applyZoom(ZOOM_STEP)" :disabled="zoom >= ZOOM_MAX" title="Acercar (Ctrl +)">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/></svg>
        </button>
      </div>

      <!-- Toggle presentación/revista -->
      <button class="rv-btn rv-btn--ppt" :class="{ active: pptMode }" @click="togglePptMode">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="16" height="11" rx="2"/><path d="M8 15v2M12 15v2M6 17h8"/></svg>
        {{ pptMode ? 'Revista' : 'Presentación' }}
      </button>

      <button class="rv-btn rv-btn--print" @click="generarReporte(filteredStats, activeFilters, geoFeatures)">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7V3h10v4M5 15H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M5 11h10v6H5z"/></svg>
        Imprimir PDF
      </button>
    </div>

    <!-- ── Loader ── -->
    <Transition name="loader-fade">
      <div v-if="!ready" class="rv-loader">
        <div class="rv-loader-book">
          <div class="rv-loader-page rv-loader-page--l"></div>
          <div class="rv-loader-page rv-loader-page--r"></div>
        </div>
        <div class="rv-loader-label">{{ loadMsg }}</div>
        <div class="rv-loader-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </Transition>

    <!-- Badge zoom flotante -->
    <Transition name="zoom-badge">
      <div v-if="showZoomBadge" class="rv-zoom-badge">{{ zoomPct }}%</div>
    </Transition>

    <!-- ── Presentación ── -->
    <Transition name="ppt-mode">
      <div v-if="pptMode" class="ppt-stage">

        <!-- Fila: flecha ← | slide | flecha → -->
        <div class="ppt-row">
          <button class="rv-arrow" @click="pptPrev" :disabled="pptFirst" aria-label="Anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>
          </button>

          <!-- Host: tamaño de pantalla, overflow hidden para la transición -->
          <div class="ppt-host" :style="{ width: pptDispW + 'px', height: pptDispH + 'px' }">
            <Transition :name="'ppt-slide-' + slideDir">
              <!-- key fuerza el remount cuando cambia el índice -->
              <div
                :key="pptIdx"
                class="ppt-frame"
                :style="{ width: pptDispW + 'px', height: pptDispH + 'px' }"
              >
                <!-- Slide nativo 1280×720 escalado -->
                <div
                  :style="{
                    width:  SLIDE_W + 'px',
                    height: SLIDE_H + 'px',
                    transform: `scale(${pptScale})`,
                    transformOrigin: 'top left',
                  }"
                  v-html="pptSlides[pptIdx]?.html ?? ''"
                />
              </div>
            </Transition>
          </div>

          <button class="rv-arrow" @click="pptNext" :disabled="pptLast" aria-label="Siguiente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        </div>

        <!-- Footer de navegación -->
        <div class="ppt-nav-footer">
          <div class="rv-dots">
            <button
              v-for="(_, i) in pptSlides" :key="i"
              class="rv-dot" :class="{ active: i === pptIdx }"
              @click="pptGoTo(i)"
            />
          </div>
          <span class="rv-lbl">{{ pptIdx + 1 }} / {{ pptTotal }}</span>
          <span class="rv-hint">← → navegar &nbsp;·&nbsp; ESC salir</span>
        </div>

      </div>
    </Transition>

    <!-- ── Stage ── -->
    <div class="rv-stage" :class="{ 'rv-stage--hidden': !ready || pptMode }">

      <!-- Prev arrow -->
      <button class="rv-arrow" @click="prev" :disabled="isFirst || !ready" aria-label="Página anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>
      </button>

      <!-- Book con zoom + pan -->
      <div
        class="rv-zoom-wrap"
        :class="{ 'rv-zoom-wrap--zoomed': isZoomed }"
        :style="{ transform: zoomTransform, transformOrigin: 'center center', cursor: zoomCursor }"
      >
        <!-- Overlay invisible para pan: solo aparece cuando hay zoom activo -->
        <!-- Captura click+drag para pan sin que PageFlip reciba el evento -->
        <div
          v-if="isZoomed"
          class="rv-pan-overlay"
          @mousedown.stop.prevent="onPanStart"
          @mousemove.stop="onPanMove"
          @mouseup.stop="onPanEnd"
          @mouseleave="onPanEnd"
          @dblclick.stop="onOverlayDblClick"
        ></div>

        <div class="rv-book-shadow" :class="{ 'rv-book-ready': ready }">
          <div ref="bookEl" class="rv-book">
            <div v-for="(html, i) in pages" :key="i" class="rp-page" style="background:#fff;overflow:hidden">
              <div class="rp-inner" v-html="html" />
            </div>
          </div>
        </div>
      </div>

      <!-- Next arrow -->
      <button class="rv-arrow" @click="next" :disabled="isLast || !ready" aria-label="Página siguiente">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
      </button>

    </div>

    <!-- ── Bottom nav ── -->
    <Transition name="footer-fade">
      <div v-if="ready && !pptMode" class="rv-footer">
        <div class="rv-dots">
          <button
            v-for="(_, i) in dotPages" :key="i"
            class="rv-dot"
            :class="{ active: (i + 1) === currentPg || (i + 1) === currentPg + 1 }"
            @click="goTo(i + 1)"
          />
        </div>
        <span class="rv-lbl">{{ pageLabel }}</span>
        <span class="rv-hint">← → para hojear &nbsp;·&nbsp; ESC para volver</span>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
/* ── Shell ── */
.rv-shell {
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
  background: radial-gradient(ellipse at center, #132b1c 0%, #0a1810 60%, #060f0a 100%);
  overflow: hidden;
  font-family: 'Prompt', sans-serif;
}

/* ── Top bar ── */
.rv-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; height: 50px; flex-shrink: 0;
  background: rgba(0,0,0,.4);
  border-bottom: 1px solid rgba(255,255,255,.07);
  gap: 12px; z-index: 20;
}
.rv-bar-center { display:flex; align-items:center; gap:10px; flex:1; justify-content:center }
.rv-bar-title  { font-size:12px; font-weight:700; color:#fff; letter-spacing:.05em; text-transform:uppercase }
.rv-bar-tag {
  background:rgba(63,173,114,.15); border:1px solid rgba(63,173,114,.3);
  border-radius:99px; padding:2px 10px;
  font-size:10px; font-weight:700; color:#3fad72;
}
.rv-btn {
  display:inline-flex; align-items:center; gap:6px;
  font-family:'Prompt',sans-serif; font-size:11px; font-weight:700;
  padding:6px 14px; border-radius:6px; border:1px solid rgba(255,255,255,.15);
  background:rgba(255,255,255,.06); color:rgba(255,255,255,.7);
  cursor:pointer; transition:all .15s; white-space:nowrap; outline:none;
}
.rv-btn svg { width:14px; height:14px; flex-shrink:0 }
.rv-btn:hover { background:rgba(255,255,255,.14); color:#fff; border-color:rgba(255,255,255,.3) }
.rv-btn--print { background:rgba(11,86,64,.35); border-color:rgba(63,173,114,.35); color:#3fad72 }
.rv-btn--print:hover { background:rgba(11,86,64,.6); color:#7de8b4 }
.rv-btn--ppt { background:rgba(29,78,216,.18); border-color:rgba(96,165,250,.3); color:#60a5fa }
.rv-btn--ppt:hover { background:rgba(29,78,216,.35); color:#93c5fd }
.rv-btn--ppt.active { background:rgba(29,78,216,.45); border-color:#60a5fa; color:#93c5fd }

/* ── Stage ── */
.rv-stage {
  flex:1; min-height:0;
  display:flex; align-items:center; justify-content:center;
  gap:20px; padding:20px 12px 8px;
}

/* ── Book shadow wrapper ── */
.rv-book-shadow {
  position:relative;
  filter: drop-shadow(0 20px 60px rgba(0,0,0,.8)) drop-shadow(0 4px 16px rgba(0,0,0,.6));
}

/* This is what page-flip takes over — do NOT set display/flex/etc here */
.rv-book { position: relative }

/* ── Individual page ── */
.rp-page {
  overflow: hidden;
  background: #fff;
}

/* Scaler: renders at A4 resolution, CSS-transforms down */
.rp-inner {
  width: v-bind('A4W + "px"');
  height: v-bind('A4H + "px"');
  transform: v-bind('`scale(${SCALE})`');
  transform-origin: top left;
  overflow: hidden;
}

/* ── Arrows ── */
.rv-arrow {
  width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
  display:flex; align-items:center; justify-content:center;
  background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12);
  color:rgba(255,255,255,.55); cursor:pointer; transition:all .18s; outline:none;
}
.rv-arrow svg { width:22px; height:22px }
.rv-arrow:hover:not(:disabled) { background:rgba(255,255,255,.16); color:#fff; border-color:rgba(255,255,255,.3) }
.rv-arrow:disabled { opacity:.18; cursor:default }

/* ── Footer ── */
.rv-footer {
  height:38px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; gap:16px;
  padding:0 20px;
}
.rv-dots { display:flex; align-items:center; gap:4px }
.rv-dot {
  width:7px; height:7px; border-radius:50%; border:none; padding:0;
  background:rgba(255,255,255,.18); cursor:pointer; transition:all .2s;
}
.rv-dot:hover  { background:rgba(255,255,255,.4) }
.rv-dot.active { background:#3fad72; transform:scale(1.3) }
.rv-lbl  { font-size:11px; color:rgba(255,255,255,.35); min-width:80px; text-align:center }
.rv-hint { font-size:10px; color:rgba(255,255,255,.18); letter-spacing:.03em }

/* ── Stage oculto mientras carga ── */
.rv-stage--hidden { opacity:0; pointer-events:none }
.rv-stage { transition: opacity .5s ease }

/* ── Book fade-in ── */
.rv-book-shadow { opacity:0; transform: scale(.97) translateY(8px); transition: opacity .55s ease, transform .55s ease }
.rv-book-shadow.rv-book-ready { opacity:1; transform: scale(1) translateY(0) }

/* ── Loader ── */
.rv-loader {
  position: absolute; inset: 50px 0 0 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 18px; z-index: 30;
}

/* Libro animado */
.rv-loader-book {
  display: flex; align-items: flex-end; gap: 3px;
  width: 56px; height: 44px;
}
.rv-loader-page {
  flex: 1; border-radius: 2px 6px 6px 2px;
  background: linear-gradient(160deg, rgba(63,173,114,.6), rgba(26,92,58,.8));
  border: 1px solid rgba(63,173,114,.3);
  animation: pagePulse 1.1s ease-in-out infinite;
}
.rv-loader-page--l {
  height: 100%;
  border-radius: 6px 2px 2px 6px;
  transform-origin: right center;
  animation-name: pageFlipL;
}
.rv-loader-page--r {
  height: 88%;
  transform-origin: left center;
  animation-name: pageFlipR;
  animation-delay: .55s;
}
@keyframes pageFlipL {
  0%,100% { transform: rotateY(0deg); opacity:.7 }
  50%      { transform: rotateY(-25deg); opacity:1 }
}
@keyframes pageFlipR {
  0%,100% { transform: rotateY(0deg); opacity:.5 }
  50%      { transform: rotateY(25deg); opacity:1 }
}

.rv-loader-label {
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,.5);
  font-family: 'Prompt', sans-serif; letter-spacing: .04em;
}

/* Tres puntos parpadeantes */
.rv-loader-dots { display: flex; gap: 6px }
.rv-loader-dots span {
  width: 5px; height: 5px; border-radius: 50%;
  background: #3fad72; animation: dotBounce .9s ease-in-out infinite;
}
.rv-loader-dots span:nth-child(2) { animation-delay: .18s }
.rv-loader-dots span:nth-child(3) { animation-delay: .36s }
@keyframes dotBounce {
  0%,80%,100% { transform: scale(.6); opacity:.4 }
  40%         { transform: scale(1);   opacity:1 }
}

/* Transición loader */
.loader-fade-leave-active { transition: opacity .4s ease, transform .4s ease }
.loader-fade-leave-to     { opacity: 0; transform: translateY(-10px) }

/* Transición footer */
.footer-fade-enter-active { transition: opacity .4s ease .2s }
.footer-fade-enter-from   { opacity: 0 }

/* ── Zoom wrapper ── */
.rv-zoom-wrap {
  position: relative;
  transition: transform .18s ease-out;
  will-change: transform;
  user-select: none;
}
/* Cuando hay zoom activo: transición rápida para pan fluido */
.rv-zoom-wrap--zoomed { transition: transform .05s linear }

/* Overlay invisible para capturar pan sin interferir con PageFlip */
.rv-pan-overlay {
  position: absolute; inset: 0; z-index: 10;
  cursor: grab;
}
.rv-pan-overlay:active { cursor: grabbing }

/* ── Controles de zoom en la barra ── */
.rv-zoom-ctrl {
  display: flex; align-items: center; gap: 4px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 6px; padding: 2px 4px;
}
.rv-zoom-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border: none; padding: 0;
  background: transparent; color: rgba(255,255,255,.55);
  border-radius: 4px; cursor: pointer; transition: all .15s;
}
.rv-zoom-btn svg { width: 14px; height: 14px }
.rv-zoom-btn:hover:not(:disabled) { background: rgba(255,255,255,.12); color: #fff }
.rv-zoom-btn:disabled { opacity: .2; cursor: default }
.rv-zoom-lbl {
  font-size: 10px; font-weight: 700; color: rgba(255,255,255,.45);
  min-width: 34px; text-align: center;
  cursor: pointer; user-select: none;
  letter-spacing: .03em;
}
.rv-zoom-lbl:hover { color: rgba(255,255,255,.7) }

/* ── Badge de zoom flotante ── */
.rv-zoom-badge {
  position: fixed; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,.75);
  backdrop-filter: blur(8px);
  color: #3fad72; font-size: 22px; font-weight: 800;
  padding: 10px 24px; border-radius: 12px;
  border: 1px solid rgba(63,173,114,.3);
  z-index: 50; pointer-events: none;
  font-family: 'Prompt', sans-serif;
  letter-spacing: .04em;
}
.zoom-badge-enter-active { transition: opacity .15s ease, transform .15s ease }
.zoom-badge-leave-active { transition: opacity .35s ease, transform .35s ease }
.zoom-badge-enter-from   { opacity: 0; transform: translate(-50%, -50%) scale(.8) }
.zoom-badge-leave-to     { opacity: 0; transform: translate(-50%, -50%) scale(1.05) }

/* ── Presentación: overlay completo ── */
.ppt-stage {
  position: absolute; inset: 50px 0 0 0; z-index: 40;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0;
  background: radial-gradient(ellipse at 50% 40%, #0d1f2e 0%, #060e18 100%);
}

/* Fila central: flechas + slide */
.ppt-row {
  flex: 1; min-height: 0;
  display: flex; align-items: center; justify-content: center;
  gap: 20px; padding: 16px 0 0;
}

/* Host: contiene las diapositivas con overflow hidden */
.ppt-host {
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 24px 72px rgba(0,0,0,.85), 0 4px 16px rgba(0,0,0,.5);
  flex-shrink: 0;
}

/* Cada frame posicionado absolute dentro del host */
.ppt-frame {
  position: absolute;
  top: 0; left: 0;
}

/* Footer de navegación */
.ppt-nav-footer {
  flex-shrink: 0;
  height: 46px;
  display: flex; align-items: center; justify-content: center; gap: 18px;
  width: 100%;
}

/* ── Transición de entrada del modo presentación ── */
.ppt-mode-enter-active { transition: opacity .4s ease }
.ppt-mode-leave-active { transition: opacity .25s ease }
.ppt-mode-enter-from,
.ppt-mode-leave-to    { opacity: 0 }

/* ── Transición direccional entre diapositivas ── */
/* Avanzar: nueva entra por la derecha, vieja sale por la izquierda */
.ppt-slide-next-enter-active,
.ppt-slide-next-leave-active  { transition: transform .42s cubic-bezier(.4,0,.2,1), opacity .3s ease }
.ppt-slide-next-enter-from    { transform: translateX(100%); opacity: .6 }
.ppt-slide-next-leave-to      { transform: translateX(-100%); opacity: .6 }

/* Retroceder: nueva entra por la izquierda, vieja sale por la derecha */
.ppt-slide-prev-enter-active,
.ppt-slide-prev-leave-active  { transition: transform .42s cubic-bezier(.4,0,.2,1), opacity .3s ease }
.ppt-slide-prev-enter-from    { transform: translateX(-100%); opacity: .6 }
.ppt-slide-prev-leave-to      { transform: translateX(100%); opacity: .6 }
</style>
