<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { PageFlip } from 'page-flip'
import { useMapStore } from '../stores/useMapStore.js'
import { buildReportePages, CSS, useReporte } from '../composables/useReporte.js'

const router  = useRouter()
const store   = useMapStore()
const { activeFilters, filteredStats } = storeToRefs(store)
const { generarReporte } = useReporte()

// A4 @ 96dpi = 794 × 1123 px — scale down to fit viewport
const A4W  = 794
const A4H  = 1123
const PG_W = 440                          // one page width in the viewer
const PG_H = Math.round(A4H * PG_W / A4W) // ≈ 623
const SCALE = PG_W / A4W                   // ≈ 0.554

const bookEl    = ref(null)
const currentPg = ref(0)
const totalPgs  = ref(0)
const geoFeatures = ref([])

const logoUrl = window.location.origin + '/Escudo%20de%20armas.png'
const fecha   = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })

// Blank left-side page so the cover lands on the RIGHT of the first spread
const BLANK_PAGE = `<div class="page" style="background:linear-gradient(160deg,#0c1a12 0%,#132b1c 100%);width:210mm;min-height:297mm"></div>`

// buildReportePages now returns {html, section}[] — extract just the html strings
const pages = computed(() => [
  BLANK_PAGE,
  ...buildReportePages(filteredStats.value, activeFilters.value, logoUrl, fecha, geoFeatures.value).map(p => p.html),
])

// Inject report CSS globally (stripped of print-only rules)
let styleEl = null

function injectCss() {
  styleEl = document.createElement('style')
  styleEl.id = 'rpt-viewer-css'
  styleEl.textContent = CSS
    .replace(/@page\s*[^{]*\{[^}]*\}/g, '')
    .replace(/@media\s+print\s*\{[\s\S]*?\n\}/g, '')
  document.head.appendChild(styleEl)
}

let pf = null

onMounted(async () => {
  // Pre-fetch GeoJSON for SVG maps in splash pages
  try {
    const res  = await fetch('/data/localizacion.geojson')
    const geo  = await res.json()
    geoFeatures.value = geo.features ?? []
  } catch { /* fallback: no map in splash pages */ }

  injectCss()
  await nextTick()

  pf = new PageFlip(bookEl.value, {
    width:              PG_W,
    height:             PG_H,
    size:               'fixed',
    showCover:          false,
    usePortrait:        false,   // force double-page spread (landscape book)
    drawShadow:         true,
    maxShadowOpacity:   0.55,
    flippingTime:       700,
    useMouseEvents:     true,
    mobileScrollSupport:false,
    startZIndex:        5,
    startPage:          0,
  })

  pf.loadFromHTML(bookEl.value.querySelectorAll('.rp-page'))

  pf.on('flip',        e => { currentPg.value = e.data })
  pf.on('changeState', e => {
    currentPg.value = pf.getCurrentPageIndex()
  })

  totalPgs.value = pf.getPageCount()
})

onUnmounted(() => {
  pf?.destroy()
  styleEl?.remove()
})

function prev() { pf?.flipPrev('bottom') }
function next() { pf?.flipNext('bottom') }
function goTo(i) { pf?.flip(i, 'bottom') }

// Keyboard
function onKey(e) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev()
  if (e.key === 'Escape') router.back()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

const pageLabel = computed(() => {
  const p = currentPg.value
  if (p <= 1) return 'Portada'
  const left  = p
  const right = p + 1
  const total = totalPgs.value - 1  // exclude blank
  return `${left} — ${right}  /  ${total}`
})

const isFirst = computed(() => currentPg.value === 0)
const isLast  = computed(() => currentPg.value >= totalPgs.value - 1)

// Dots skip the blank page (index 0)
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

      <button class="rv-btn rv-btn--print" @click="generarReporte(filteredStats, activeFilters, geoFeatures.value)">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7V3h10v4M5 15H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M5 11h10v6H5z"/></svg>
        Imprimir PDF
      </button>
    </div>

    <!-- ── Stage ── -->
    <div class="rv-stage">

      <!-- Prev arrow -->
      <button class="rv-arrow" @click="prev" :disabled="isFirst" aria-label="Página anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>
      </button>

      <!-- Book -->
      <div class="rv-book-shadow">
        <div ref="bookEl" class="rv-book">
          <!-- Pages — page-flip takes these over after mount -->
          <div v-for="(html, i) in pages" :key="i" class="rp-page" style="background:#fff;overflow:hidden">
            <div class="rp-inner" v-html="html" />
          </div>
        </div>
      </div>

      <!-- Next arrow -->
      <button class="rv-arrow" @click="next" :disabled="isLast" aria-label="Página siguiente">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>
      </button>

    </div>

    <!-- ── Bottom nav ── -->
    <div class="rv-footer">
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
</style>
