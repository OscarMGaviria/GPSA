<script setup>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { Route, Ruler, MapPin, GitBranch } from '@lucide/vue'
import StatCard       from '../atoms/StatCard.vue'
import ProgressBar    from '../atoms/ProgressBar.vue'
import RadarChart     from '../atoms/RadarChart.vue'
import StatsDetailModal from './StatsDetailModal.vue'
import { shortLabel, mesesTranscurridos, pctTiempoTranscurrido, calcAvanceKm } from '../../utils/stats.js'

const emit = defineEmits(['filter-subregion', 'open-via', 'fly-via'])

const panelRef = ref(null)

// Mobile bottom sheet state
const mobileState = ref('collapsed')

function cycleMobileState() {
  if (mobileState.value === 'collapsed') {
    mobileState.value = 'half'
  } else if (mobileState.value === 'half') {
    mobileState.value = 'expanded'
  } else {
    mobileState.value = 'collapsed'
  }
}

let touchStartY = 0
let touchStartX = 0
let touchStartTime = 0

function onTouchStart(e) {
  if (e.touches.length > 0) {
    touchStartY = e.touches[0].clientY
    touchStartX = e.touches[0].clientX
    touchStartTime = Date.now()
  }
}

function onTouchEnd(e) {
  if (e.changedTouches.length > 0) {
    const deltaY = e.changedTouches[0].clientY - touchStartY
    const deltaX = e.changedTouches[0].clientX - touchStartX
    const duration = Date.now() - touchStartTime
    
    // Quick swipe and vertical movement dominates
    if (Math.abs(deltaY) > 40 && Math.abs(deltaY) > Math.abs(deltaX) && duration < 350) {
      if (deltaY < 0) {
        // Swipe up
        if (mobileState.value === 'collapsed') {
          mobileState.value = 'half'
        } else if (mobileState.value === 'half') {
          mobileState.value = 'expanded'
        }
      } else {
        // Swipe down
        if (mobileState.value === 'expanded') {
          mobileState.value = 'half'
        } else if (mobileState.value === 'half') {
          mobileState.value = 'collapsed'
        }
      }
    }
  }
}


const props = defineProps({
  isOpen:            { type: Boolean, default: true },
  activeSubregion:   { type: String,  default: '' },
  loading:           { type: Boolean, default: false },

  // KPI
  viasIntervenidas: { type: Number, default: 47 },
  longitudTotal:    { type: Number, default: 634.43 },
  municipios:       { type: Number, default: 42 },
  circuitos:        { type: Number, default: 29 },

  // Avance
  avanceFisicoPct: { type: Number, default: 3 },
  avanceKmPct:     { type: Number, default: 3 },
  kmIntervenidos:  { type: Number, default: 0.0 },
  kmContractuales: { type: Number, default: 634.4 },
  kmPendientes:    { type: Number, default: 634.4 },

  // Subregiones
  subregiones: { type: Array, default: () => [] },

  // Detalle de vías para modales y radar
  viasDetalle:    { type: Array,  default: () => [] },
  totalViasGlobal: { type: Number, default: 1 },
  totalKmGlobal:   { type: Number, default: 1 },
})

// ── Modal de detalle ──────────────────────────────────────────────────────
const modalTipo = ref(null) // 'vias' | 'longitud' | 'municipios' | 'circuitos'
function abrirModal(tipo) { modalTipo.value = tipo }
function cerrarModal()    { modalTipo.value = null }

// ── Animate-in control ──────────────────────────────────────────────────────
const showContent = ref(props.isOpen)
let openTimer  = null
let innerTimer = null

// ── Count-up animation ───────────────────────────────────────────────────────
const dispVias  = ref(0)
const dispLong  = ref(0)
const dispMpios = ref(0)
const dispCirc  = ref(0)

let rafHandles = []

function countUp(dispRef, target, duration = 1000) {
  const from      = dispRef.value
  const startTime = performance.now()
  function step(now) {
    const t      = Math.min((now - startTime) / duration, 1)
    const eased  = 1 - (1 - t) ** 3
    dispRef.value = from + (target - from) * eased
    if (t < 1) rafHandles.push(requestAnimationFrame(step))
    else dispRef.value = target
  }
  rafHandles.push(requestAnimationFrame(step))
}

function cancelAllRafs() {
  rafHandles.forEach(cancelAnimationFrame)
  rafHandles = []
}

function resetCounters() {
  cancelAllRafs()
  dispVias.value  = 0
  dispLong.value  = 0
  dispMpios.value = 0
  dispCirc.value  = 0
}

function animateCounters() {
  cancelAllRafs()
  countUp(dispVias,  props.viasIntervenidas)
  countUp(dispLong,  props.longitudTotal,   1200)
  countUp(dispMpios, props.municipios)
  countUp(dispCirc,  props.circuitos)
}

// Formatters para mostrar en las cards
const fmtVias  = computed(() => Math.round(dispVias.value))
const fmtLong  = computed(() => dispLong.value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const fmtMpios = computed(() => Math.round(dispMpios.value))
const fmtCirc  = computed(() => Math.round(dispCirc.value))

watch(() => props.isOpen, (val) => {
  clearTimeout(openTimer)
  if (val) {
    openTimer = setTimeout(() => {
      showContent.value = true
      innerTimer = setTimeout(animateCounters, 80)
    }, 280)
  } else {
    showContent.value = false
    resetCounters()
  }
}, { immediate: true })

// Re-animar cuando llegan datos reales del API
watch(
  () => [props.viasIntervenidas, props.longitudTotal, props.municipios, props.circuitos],
  () => { if (showContent.value) animateCounters() }
)

function handleClickOutside(event) {
  if (window.innerWidth > 1024) return
  if (mobileState.value === 'collapsed') return
  if (panelRef.value && !panelRef.value.contains(event.target)) {
    mobileState.value = 'collapsed'
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, { passive: true })
})

onUnmounted(() => {
  clearTimeout(openTimer)
  clearTimeout(innerTimer)
  cancelAllRafs()
  document.removeEventListener('click', handleClickOutside)
})

// ── Avance en km calculado desde viasDetalle ────────────────────────────────
const avanceKmCalc = computed(() => calcAvanceKm(props.viasDetalle))

// ── Avance en plazo (meses transcurridos vs plazo total) ─────────────────────

// ── Radar chart ─────────────────────────────────────────────────────────────
const radarAxes = computed(() => {
  const vias = props.viasDetalle
  if (!vias.length) return []

  const totalVias = vias.length
  const avanceFis = Math.round(vias.reduce((s, v) => s + (v.avance    || 0), 0) / totalVias)
  const avanceFin = Math.round(vias.reduce((s, v) => s + (v.avanceFin || 0), 0) / totalVias)

  // Avance en plazo: promedio de pctTiempoTranscurrido por vía usando fechaIni y plazoMeses
  const avancePlazo = Math.min(100, Math.round(
    vias.reduce((s, v) => {
      return s + pctTiempoTranscurrido(v.fechaIni, v.plazoMeses)
    }, 0) / totalVias
  ))

  return [
    { label: 'Físico',     value: avanceFis },
    { label: 'Financiero', value: avanceFin },
    { label: 'Plazo',      value: avancePlazo },
  ]
})

// ── Bar chart helpers ─────────────────────────────────────────────────────────

const subregionesFiltradas = computed(() =>
  props.subregiones.filter(s => s.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') !== 'valle de aburra')
)

const maxKm = computed(() => Math.max(...subregionesFiltradas.value.map(s => s.km), 1))

function toggleSubregion(name) {
  const next = props.activeSubregion === name ? 'Todas las subregiones' : name
  emit('filter-subregion', next)
}

const yTicks = computed(() => {
  const max  = maxKm.value
  const step = Math.ceil(max / 4 / 10) * 10
  const ticks = []
  for (let v = 0; v <= max; v += step) ticks.unshift(v)
  return ticks
})
</script>

<template>
  <div
    ref="panelRef"
    class="stats-side"
    :class="{
      open: props.isOpen,
      'mobile-collapsed': mobileState === 'collapsed',
      'mobile-half': mobileState === 'half',
      'mobile-expanded': mobileState === 'expanded'
    }"
  >
    <!-- Handle for mobile swipeable bottom sheet -->
    <div
      class="bottom-sheet-handle-wrapper mobile-only"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
      @click="cycleMobileState"
    >
      <div class="bottom-sheet-handle"></div>
      <div class="bottom-sheet-summary" v-if="mobileState === 'collapsed'">
        <span class="summary-item"><strong>{{ circuitos }}</strong> circuitos</span>
        <span class="summary-dot">•</span>
        <span class="summary-item"><strong>{{ longitudTotal.toFixed(2) }}</strong> km</span>
      </div>
    </div>

    <div class="panel-inner">

      <!-- ── KPI cards ─────────────────────────────────────────────────── -->
      <div class="cards-row" :class="{ animate: showContent }">
        <template v-if="loading">
          <div v-for="n in 4" :key="n" class="stat-skeleton" />
        </template>
        <template v-else>
          <StatCard title="Vías intervenidas" :value="fmtVias" @click="abrirModal('vias')"
            tooltip="Tramos de vía incluidos en el programa de pavimentación departamental">
            <Route :size="18" />
          </StatCard>
          <StatCard title="Longitud total" :value="fmtLong" unit="km" @click="abrirModal('longitud')"
            tooltip="Kilómetros totales de vía contratados para intervención">
            <Ruler :size="18" />
          </StatCard>
          <StatCard title="Municipios" :value="fmtMpios" @click="abrirModal('municipios')"
            tooltip="Municipios de Antioquia con al menos un tramo intervenido">
            <MapPin :size="18" />
          </StatCard>
          <StatCard title="Circuitos" :value="fmtCirc" @click="abrirModal('circuitos')"
            tooltip="Circuitos viales: conjuntos de tramos agrupados por corredor">
            <GitBranch :size="18" />
          </StatCard>
        </template>
      </div>

      <!-- ── Modal de detalle ───────────────────────────────────────────── -->
      <StatsDetailModal
        v-if="modalTipo"
        :tipo="modalTipo"
        :vias-detalle="viasDetalle"
        :subregiones="subregiones"
        @close="cerrarModal"
        @open-via="via => { cerrarModal(); emit('open-via', via) }"
        @fly-via="via => { cerrarModal(); emit('fly-via', via) }"
      />

      <!-- ── Avance físico + Avance en km ──────────────────────────────── -->
      <div class="avance-row" :class="{ animate: showContent }">

        <!-- Radar de avance -->
        <div class="avance-card radar-card">
          <div class="section-label">
            <span class="sl-dot">◈</span> Indicadores de avance
          </div>
          <div class="radar-wrap">
            <RadarChart :axes="radarAxes" :size="160" />
          </div>
        </div>

        <!-- Avance en km -->
        <div class="avance-card avance-km">
          <div class="section-label">
            <span class="sl-dot">↗</span> Avance en kilómetros
          </div>

          <div class="km-pct-label">{{ avanceKmCalc.pct }}% km estabilizados</div>
          <ProgressBar
            :pct="avanceKmCalc.pct"
            color="#2d8653"
            track-color="#c6e8d3"
            :height="10"
          />
          <div class="km-range">
            <span>0 km</span>
            <span>{{ avanceKmCalc.contractuales.toFixed(1) }} km totales</span>
          </div>

          <div class="km-metrics">
            <div class="km-metric">
              <span class="km-val">{{ avanceKmCalc.intervenidos.toFixed(1) }}</span>
              <span class="km-unit">km</span>
              <span class="km-lbl">INTERVENIDOS</span>
            </div>
            <div class="km-sep" />
            <div class="km-metric">
              <span class="km-val">{{ avanceKmCalc.contractuales.toFixed(1) }}</span>
              <span class="km-unit">km</span>
              <span class="km-lbl">CONTRACTUALES</span>
            </div>
            <div class="km-sep" />
            <div class="km-metric pending">
              <span class="km-val">{{ avanceKmCalc.pendientes.toFixed(1) }}</span>
              <span class="km-unit">km</span>
              <span class="km-lbl">PENDIENTES</span>
            </div>
          </div>
        </div>

      </div>

      <!-- ── Gráfica por subregión ─────────────────────────────────────── -->
      <div class="chart-card" :class="{ animate: showContent }">
        <div class="chart-title">Longitud por subregión (km)</div>
        <div class="chart-body">

          <!-- Y-axis -->
          <div class="chart-y">
            <div v-for="tick in yTicks" :key="tick" class="y-tick">{{ tick }} km</div>
          </div>

          <!-- Bars -->
          <div class="chart-area">
            <!-- Líneas de referencia sutiles -->
            <div class="chart-grid">
              <div v-for="tick in yTicks" :key="tick" class="grid-line" />
            </div>

            <div
              v-for="(s, i) in subregionesFiltradas"
              :key="s.name"
              class="bar-col"
              :class="{ 'bar-col--active': activeSubregion === s.name, 'bar-col--dimmed': activeSubregion && activeSubregion !== s.name }"
              @click="toggleSubregion(s.name)"
              role="button"
              :aria-pressed="activeSubregion === s.name"
              :title="activeSubregion === s.name ? `Quitar filtro: ${s.name}` : `Filtrar por ${s.name}`"
            >
              <div class="bar-outer">
                <div
                  class="bar-fill"
                  :class="{ 'bar-fill--empty': s.km === 0 }"
                  :style="{
                    height: s.km > 0 ? Math.max((s.km / maxKm * 100), 4) + '%' : '4px',
                    animationDelay: (i * 80) + 'ms'
                  }"
                >
                  <span v-if="s.km > 0" class="bar-badge">{{ s.km.toFixed(2) }} km</span>
                </div>
              </div>
              <span class="bar-label" :title="s.name">{{ shortLabel(s.name) }}</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Panel shell ──────────────────────────────────────────────────────────── */
.stats-side {
  position: relative;
  flex-shrink: 0;
  width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #eaf4ed;
  border-left: none;
  transition: width .46s cubic-bezier(.34, 1.10, 0.64, 1),
              box-shadow .46s ease;
  will-change: width;
}

/* Blobs decorativos que sirven de fondo para el backdrop-filter */
.stats-side::before,
.stats-side::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
}
.stats-side::before {
  width: 280px; height: 280px;
  top: -60px; right: -60px;
  background: radial-gradient(circle, rgba(45,134,83,0.35) 0%, transparent 70%);
  filter: blur(40px);
}
.stats-side::after {
  width: 220px; height: 220px;
  bottom: 40px; left: -40px;
  background: radial-gradient(circle, rgba(11,86,64,0.28) 0%, transparent 70%);
  filter: blur(38px);
}
.stats-side.open {
  width: 50%;
  border-left: 1px solid rgba(200,223,208,0.6);
  box-shadow: -6px 0 28px rgba(11,86,64,.12);
}

/* ── Scrollable body ──────────────────────────────────────────────────────── */
.panel-inner {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  min-height: 0;
  position: relative;
  z-index: 1;
}

/* ── Keyframes ────────────────────────────────────────────────────────────── */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(18px) scale(.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);   }
}
@keyframes fadeSlideRight {
  from { opacity: 0; transform: translateX(-14px); }
  to   { opacity: 1; transform: translateX(0);     }
}

/* ── Skeleton cards ───────────────────────────────────────────────────────── */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}

.stat-skeleton {
  border-radius: 16px;
  height: 110px;
  background: linear-gradient(90deg, #d6eadb 25%, #eaf4ed 50%, #d6eadb 75%);
  background-size: 800px 100%;
  animation: shimmer 1.4s infinite linear;
  border: 1px solid rgba(255,255,255,0.6);
}

/* ── KPI cards ────────────────────────────────────────────────────────────── */
.cards-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.cards-row > * { opacity: 0; }
.cards-row.animate > *:nth-child(1) { animation: fadeSlideUp .38s cubic-bezier(.34,1.10,.64,1)  60ms  both; }
.cards-row.animate > *:nth-child(2) { animation: fadeSlideUp .38s cubic-bezier(.34,1.10,.64,1) 130ms  both; }
.cards-row.animate > *:nth-child(3) { animation: fadeSlideUp .38s cubic-bezier(.34,1.10,.64,1) 200ms  both; }
.cards-row.animate > *:nth-child(4) { animation: fadeSlideUp .38s cubic-bezier(.34,1.10,.64,1) 270ms  both; }

/* ── Avance row ───────────────────────────────────────────────────────────── */
.avance-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  opacity: 0;
}
.avance-row.animate {
  animation: fadeSlideRight .40s cubic-bezier(.34,1.10,.64,1) 340ms both;
}

.avance-card {
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(200,223,208,0.55);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(45,134,83,.08), 0 1px 3px rgba(0,0,0,.05);
  transition: transform .18s ease-out, box-shadow .18s ease-out, background .18s ease-out;
}
.avance-card:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
@media (hover: hover) and (pointer: fine) {
  .avance-card:hover {
    transform: translateY(-3px) scale(1.01);
    background: rgba(255,255,255,0.92);
    box-shadow: 0 8px 24px rgba(45,134,83,.14), 0 2px 6px rgba(0,0,0,.07),
                inset 0 1px 0 rgba(255,255,255,0.8);
  }
}

.section-label {
  align-self: flex-start;
  font-size: 11px;
  font-weight: 700;
  color: #374151;
  letter-spacing: .02em;
  display: flex;
  align-items: center;
  gap: 4px;
}
.sl-dot { color: #2d8653; }

.ring-wrap { align-self: center; }

.radar-card { align-items: center; }
.radar-wrap { align-self: center; display: flex; align-items: center; justify-content: center; flex: 1; }

.phase-badge {
  background: #fce7f3;
  color: #be185d;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 99px;
}

/* Avance km */
.avance-km { align-items: stretch; gap: 6px; }
.avance-km .section-label { margin-bottom: 2px; }

.km-pct-label {
  font-family: 'Prompt', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #2d8653;
  text-align: right;
  margin-bottom: 2px;
}
.km-range {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #9ca3af;
}

.km-metrics {
  display: flex;
  align-items: stretch;
  border-top: 1px solid #d1e9d8;
  padding-top: 8px;
  margin-top: 2px;
}
.km-metric {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.km-val  { font-size: 20px; font-weight: 800; color: #1a3c2d; line-height: 1; }
.km-unit { font-size: 12px; font-weight: 700; color: #2d8653; }
.km-lbl  {
  font-size: 8px; font-weight: 700; color: #9ca3af;
  letter-spacing: .06em; text-transform: uppercase; margin-top: 2px;
}
.pending .km-val,
.pending .km-unit { color: #f59e0b; }
.km-sep { width: 1px; background: #d1e9d8; margin: 4px 0; }

/* ── Bar chart ────────────────────────────────────────────────────────────── */
.chart-card {
  background: rgba(255,255,255,0.45);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.75);
  border-radius: 16px;
  padding: 14px;
  opacity: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 160px;
  box-shadow: 0 4px 20px rgba(11,86,64,.08), 0 1px 4px rgba(0,0,0,.05),
              inset 0 1px 0 rgba(255,255,255,0.6);
}
.chart-card.animate {
  animation: fadeSlideUp .42s cubic-bezier(.34,1.10,.64,1) 420ms both;
}

.chart-title {
  font-size: 12px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.chart-body {
  display: flex;
  gap: 4px;
  flex: 1;
  min-height: 0;
  margin-bottom: 25px; /* Espacio para las etiquetas de subregión absoluto-posicionadas */
}

.chart-y {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  flex-shrink: 0;
  width: 34px;
}
.y-tick {
  font-size: clamp(9px, 0.75vw, 12px);
  color: #9ca3af;
  white-space: nowrap;
}

.chart-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  border-bottom: 1.5px solid #c8e6d4;
}

.chart-grid {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  pointer-events: none;
  z-index: 0;
}
.grid-line {
  width: 100%;
  height: 1px;
  background: rgba(200, 230, 212, 0.6);
  border-top: 1px dashed rgba(180, 220, 196, 0.7);
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  height: 100%;
  cursor: pointer;
  position: relative;
  z-index: 1;
}
.bar-col--active .bar-fill {
  background: linear-gradient(180deg, #3fad72 0%, #0b5640 100%) !important;
  box-shadow: 0 0 0 2px #3fad72, 0 4px 12px rgba(11,86,64,.35);
}
.bar-col--active .bar-label {
  color: #0b5640;
  font-weight: 700;
}
.bar-col--active .bar-badge {
  background: #08402f;
  color: #fff;
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}
.bar-col--dimmed {
  opacity: 0.55;
  transition: opacity .2s;
}
.bar-col:active {
  transform: scale(0.96);
  transition: transform 100ms ease-out;
}
@media (hover: hover) and (pointer: fine) {
  .bar-col--dimmed:hover {
    opacity: 0.85;
  }
  .bar-col:hover .bar-fill {
    background: linear-gradient(180deg, rgba(45,134,83,0.75) 0%, rgba(26,92,58,0.65) 100%);
    box-shadow: 0 -4px 12px rgba(45, 134, 83, 0.3);
    transform: scaleY(1) translateY(-3px);
  }
  .bar-col:hover .bar-label {
    color: #1a5c3a;
    font-weight: 700;
  }
}
.bar-outer {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}
.bar-badge {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translate(-50%, 2px) scale(0.9);
  font-size: clamp(9px, 0.75vw, 11.5px); /* Fuente más alta */
  font-weight: 800;
  color: #ffffff;
  background: rgba(11, 86, 64, 0.9);
  padding: 2px;
  border-radius: 4px;
  white-space: normal; /* Permite saltar de línea si no cabe el texto */
  word-break: break-word;
  z-index: 2;
  pointer-events: none;
  opacity: 0;
  width: 95%; /* Se ajusta exactamente al ancho de la barra */
  max-width: 95%; /* Nunca se sale del ancho disponible de la barra */
  box-sizing: border-box;
  text-align: center;
  line-height: 1.1;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: opacity 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.bar-col:hover .bar-badge {
  opacity: 1;
  transform: translate(-50%, 0) scale(1);
}

.bar-fill {
  width: 78%;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  background: linear-gradient(180deg, rgba(45,134,83,0.45) 0%, rgba(26,92,58,0.35) 100%);
  animation: barGrow .7s cubic-bezier(.34,1.10,.64,1) both;
  transform-origin: bottom;
  transition: background .25s ease, box-shadow .25s ease, transform .25s ease;
  position: relative;
}

@keyframes barGrow {
  from { transform: scaleY(0); opacity: 0; }
  to   { transform: scaleY(1); opacity: 1; }
}

.bar-fill--empty {
  background: repeating-linear-gradient(
    45deg,
    #d1e9d8,
    #d1e9d8 2px,
    transparent 2px,
    transparent 6px
  ) !important;
  border: 1px dashed #b0d9be;
  border-radius: 3px;
  opacity: 0.7;
  box-shadow: none !important;
  height: 8px !important;
}
.bar-col:hover .bar-fill--empty {
  opacity: 1;
  transform: none !important;
  width: 78% !important;
}
.bar-label {
  position: absolute;
  bottom: -25px; /* Posicionada debajo de la línea base */
  left: 0;
  right: 0;
  height: 22px;
  font-size: clamp(9px, 0.75vw, 12px);
  color: #6b7280;
  text-align: center;
  line-height: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color .25s ease, font-weight .25s ease;
}
@media (prefers-reduced-motion: reduce) {
  .avance-card,
  .avance-card:active,
  .bar-col,
  .bar-col:active,
  .bar-fill { transition: none; animation: none; }
  @keyframes fadeSlideUp   { from { opacity: 1; transform: none; } }
  @keyframes fadeSlideRight { from { opacity: 1; transform: none; } }
  @keyframes barGrow       { from { transform: scaleY(1); opacity: 1; } }
  @keyframes shimmer       { from { background-position: 0 0; } }
}

/* Mobile bottom sheet controls */
.mobile-only {
  display: none !important;
}

@media (max-width: 1024px) {
  .mobile-only {
    display: flex !important;
  }
  
  .stats-side {
    position: absolute !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100% !important;
    z-index: 1000 !important;
    border-left: none !important;
    border-top: 1px solid rgba(200, 223, 208, 0.8) !important;
    border-radius: 20px 20px 0 0 !important;
    box-shadow: 0 -8px 24px rgba(11, 86, 64, 0.15) !important;
    background: #eaf4ed !important;
    overflow: hidden !important;
    transition: height 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
    display: flex !important;
    flex-direction: column !important;
  }
  
  .stats-side.mobile-collapsed {
    height: 64px !important;
  }
  
  .stats-side.mobile-half {
    height: 45vh !important;
  }
  
  .stats-side.mobile-expanded {
    height: 85vh !important;
  }
  
  .panel-inner {
    padding: 0 16px 20px !important;
    height: calc(100% - 64px) !important;
    overflow-y: auto !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 16px !important;
  }
  
  .cards-row {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px !important;
  }
  
  .avance-row {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
  }
  
  .chart-card {
    min-height: 200px !important;
  }
  
  .chart-body {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    padding-bottom: 8px !important;
  }
  
  .chart-area {
    min-width: 480px !important;
  }
}

.bottom-sheet-handle-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 16px 8px;
  cursor: pointer;
  background: #eaf4ed;
  border-bottom: 1px solid rgba(200, 223, 208, 0.4);
  flex-shrink: 0;
  user-select: none;
}

.bottom-sheet-handle {
  width: 36px;
  height: 5px;
  background: #cbd5e1;
  border-radius: 3px;
  margin-bottom: 6px;
  transition: background 0.2s;
}

.bottom-sheet-handle-wrapper:hover .bottom-sheet-handle {
  background: #94a3b8;
}

.bottom-sheet-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  color: #1a5c3a;
  animation: fadeIn 0.2s ease-in-out;
}

.summary-item strong {
  font-weight: 700;
  color: #0b5640;
}

.summary-dot {
  color: #a3d9b9;
  font-size: 10px;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
