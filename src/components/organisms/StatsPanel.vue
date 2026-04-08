<script setup>
import { ref, watch, computed, onUnmounted } from 'vue'
import { Route, Ruler, MapPin, GitBranch } from 'lucide-vue-next'
import StatCard       from '../atoms/StatCard.vue'
import ProgressRing   from '../atoms/ProgressRing.vue'
import ProgressBar    from '../atoms/ProgressBar.vue'
import StatsDetailModal from './StatsDetailModal.vue'

const emit = defineEmits(['filter-subregion'])

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

  // Detalle de vías para modales
  viasDetalle: { type: Array, default: () => [] },
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
})

// Re-animar cuando llegan datos reales del API
watch(
  () => [props.viasIntervenidas, props.longitudTotal, props.municipios, props.circuitos],
  () => { if (showContent.value) animateCounters() }
)

onUnmounted(() => {
  clearTimeout(openTimer)
  clearTimeout(innerTimer)
  cancelAllRafs()
})

// ── Bar chart helpers ───────────────────────────────────────────────────────
const ABREVIATURAS = {
  'valle de aburra': 'Valle',
  'oriente':         'Oriente',
  'occidente':       'Occidente',
  'norte':           'Norte',
  'nordeste':        'Nordeste',
  'uraba':           'Urabá',
  'bajo cauca':      'Bajo C.',
  'magdalena medio': 'Magd. M.',
  'suroeste':        'Suroeste',
}

function shortLabel(name) {
  const key = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return ABREVIATURAS[key] ?? name
}

const maxKm = computed(() => Math.max(...props.subregiones.map(s => s.km), 1))

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
  <div class="stats-side" :class="{ open: props.isOpen }">
    <div class="panel-inner">

      <!-- ── KPI cards ─────────────────────────────────────────────────── -->
      <div class="cards-row" :class="{ animate: showContent }">
        <template v-if="loading">
          <div v-for="n in 4" :key="n" class="stat-skeleton" />
        </template>
        <template v-else>
          <StatCard title="Vías intervenidas" :value="fmtVias" @click="abrirModal('vias')" title-attr="Ver detalle de vías">
            <Route :size="18" />
          </StatCard>
          <StatCard title="Longitud total" :value="fmtLong" unit="km" @click="abrirModal('longitud')" title-attr="Ver distribución por subregión">
            <Ruler :size="18" />
          </StatCard>
          <StatCard title="Municipios" :value="fmtMpios" @click="abrirModal('municipios')" title-attr="Ver detalle por municipio">
            <MapPin :size="18" />
          </StatCard>
          <StatCard title="Circuitos" :value="fmtCirc" @click="abrirModal('circuitos')" title-attr="Ver detalle de circuitos">
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
      />

      <!-- ── Avance físico + Avance en km ──────────────────────────────── -->
      <div class="avance-row" :class="{ animate: showContent }">

        <!-- Avance físico -->
        <div class="avance-card">
          <div class="section-label">
            <span class="sl-dot">✓</span> Avance físico
          </div>
          <div class="ring-wrap">
            <ProgressRing
              :pct="avanceFisicoPct"
              :size="110"
              :stroke="10"
              sublabel="Ponderado por longitud intervenida"
            />
          </div>
          <span class="phase-badge">Inicio</span>
        </div>

        <!-- Avance en km -->
        <div class="avance-card avance-km">
          <div class="section-label">
            <span class="sl-dot">↗</span> Avance en kilómetros
          </div>

          <ProgressBar
            :pct="avanceKmPct"
            color="#2d8653"
            track-color="#c6e8d3"
            :height="10"
          />
          <div class="km-range">
            <span>0 km</span>
            <span>{{ kmContractuales.toFixed(1) }} km totales</span>
          </div>

          <div class="km-metrics">
            <div class="km-metric">
              <span class="km-val">{{ kmIntervenidos.toFixed(1) }}</span>
              <span class="km-unit">km</span>
              <span class="km-lbl">INTERVENIDOS</span>
            </div>
            <div class="km-sep" />
            <div class="km-metric">
              <span class="km-val">{{ kmContractuales.toFixed(1) }}</span>
              <span class="km-unit">km</span>
              <span class="km-lbl">CONTRACTUALES</span>
            </div>
            <div class="km-sep" />
            <div class="km-metric pending">
              <span class="km-val">{{ kmPendientes.toFixed(1) }}</span>
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
              v-for="(s, i) in subregiones"
              :key="s.name"
              class="bar-col"
              :class="{ 'bar-col--active': activeSubregion === s.name, 'bar-col--dimmed': activeSubregion && activeSubregion !== s.name }"
              @click="toggleSubregion(s.name)"
              role="button"
              :aria-pressed="activeSubregion === s.name"
              :title="activeSubregion === s.name ? `Quitar filtro: ${s.name}` : `Filtrar por ${s.name}`"
            >
              <div class="bar-outer">
                <span v-if="s.km > 0" class="bar-badge">{{ s.km }} km</span>
                <div
                  class="bar-fill"
                  :class="{ 'bar-fill--empty': s.km === 0 }"
                  :style="{
                    height: s.km > 0 ? Math.max((s.km / maxKm * 100), 4) + '%' : '4px',
                    animationDelay: (i * 80) + 'ms'
                  }"
                />
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
  background: rgba(255,255,255,0.45);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255,255,255,0.75);
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 20px rgba(11,86,64,.08), 0 1px 4px rgba(0,0,0,.05),
              inset 0 1px 0 rgba(255,255,255,0.6);
  transition: box-shadow .2s ease, background .2s ease;
}
.avance-card:hover {
  background: rgba(255,255,255,0.72);
  box-shadow: 0 8px 32px rgba(11,86,64,.13), 0 2px 8px rgba(0,0,0,.06),
              inset 0 1px 0 rgba(255,255,255,0.7);
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
}

.chart-y {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 24px;
  flex-shrink: 0;
  width: 34px;
}
.y-tick {
  font-size: 8px;
  color: #9ca3af;
  white-space: nowrap;
}

.chart-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  padding-bottom: 24px;
  border-bottom: 1.5px solid #c8e6d4;
}

.chart-grid {
  position: absolute;
  inset: 0;
  bottom: 24px;
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
  background: #0b5640;
  color: #fff;
}
.bar-col--dimmed {
  opacity: 0.38;
  transition: opacity .2s;
}
.bar-col--dimmed:hover {
  opacity: 0.75;
}
.bar-col:hover .bar-fill {
  background: linear-gradient(180deg, #3fad72 0%, #236b46 100%);
  width: 90%;
  box-shadow: 0 -4px 12px rgba(45, 134, 83, 0.5);
  transform: scaleY(1) translateY(-3px);
}
.bar-col:hover .bar-label {
  color: #1a5c3a;
  font-weight: 700;
}
.bar-col:hover .bar-badge {
  background: rgba(45, 134, 83, 0.7);
  transform: translateX(-50%) translateY(-4px) scale(1.1);
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
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  font-weight: 700;
  color: #fff;
  background: rgba(255,255,255,0.22);
  padding: 1px 3px;
  border-radius: 3px;
  white-space: nowrap;
  z-index: 1;
  animation: fadeDown .4s ease both;
  animation-delay: inherit;
  transition: background .25s ease, transform .25s ease;
}

@keyframes fadeDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
.bar-fill {
  width: 78%;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  background: linear-gradient(180deg, #2d8653 0%, #1a5c3a 100%);
  animation: barGrow .7s cubic-bezier(.34,1.10,.64,1) both;
  transform-origin: bottom;
  transition: width .25s ease, background .25s ease, box-shadow .25s ease, transform .25s ease;
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
  font-size: 8px;
  color: #6b7280;
  text-align: center;
  line-height: 1.2;
  height: 22px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: color .25s ease, font-weight .25s ease;
}
</style>
