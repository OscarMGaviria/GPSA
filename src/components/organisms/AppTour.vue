<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { X, ChevronLeft, ChevronRight } from '@lucide/vue'

const emit = defineEmits(['close'])

const STEPS = [
  {
    selector: '.header-filters',
    title: 'Filtros de búsqueda',
    text: 'Usa el buscador o los selectores para filtrar por subregión, municipio o circuito. Los filtros se combinan entre sí. El botón ✕ borra todos los filtros activos.',
    position: 'bottom',
  },
  {
    selector: '.map-container',
    title: 'Mapa interactivo',
    text: 'Pasa el mouse sobre una vía (línea naranja) para ver su nombre con una animación de resalte. Haz clic sobre ella para ver el detalle completo del tramo.',
    position: 'right',
  },
  {
    selector: '.cards-row',
    title: 'Indicadores principales',
    text: 'Muestra el total de vías, longitud acumulada, municipios y circuitos según los filtros activos. Haz clic en cualquier card para ver el detalle en tabla.',
    position: 'left',
  },
  {
    selector: '.avance-row',
    title: 'Indicadores de avance',
    text: 'El gráfico radar muestra el avance físico, financiero, cobertura en km, vías iniciadas y contratadas. Se actualiza según la selección del mapa.',
    position: 'left',
  },
  {
    selector: '.chart-card',
    title: 'Longitud por subregión',
    text: 'Cada barra representa los kilómetros intervenidos en una subregión. Haz clic en una barra para filtrar el mapa por esa subregión. Haz clic de nuevo para quitar el filtro.',
    position: 'left',
  },
]

const PADDING = 10
const currentStep = ref(0)
const rect = ref(null)

function getRect(selector) {
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return {
    top:    Math.max(0, r.top    - PADDING),
    left:   Math.max(0, r.left   - PADDING),
    width:  r.width  + PADDING * 2,
    height: r.height + PADDING * 2,
    right:  r.right  + PADDING,
    bottom: r.bottom + PADDING,
  }
}

async function goTo(index) {
  currentStep.value = index
  await nextTick()
  rect.value = getRect(STEPS[index].selector)
}

function next() {
  if (currentStep.value < STEPS.length - 1) goTo(currentStep.value + 1)
  else close()
}

function prev() {
  if (currentStep.value > 0) goTo(currentStep.value - 1)
}

function close() {
  localStorage.setItem('simeva-tour-done', '1')
  emit('close')
}

function onResize() {
  rect.value = getRect(STEPS[currentStep.value].selector)
}

onMounted(() => {
  goTo(0)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})

const step = computed(() => STEPS[currentStep.value])

// Posición del tooltip
const GAP = 14
const tooltipStyle = computed(() => {
  if (!rect.value) return { display: 'none' }
  const r = rect.value
  const W = window.innerWidth
  const H = window.innerHeight
  const TW = 300

  if (step.value.position === 'bottom') {
    const left = Math.min(Math.max(8, r.left), W - TW - 8)
    return { top: Math.min(r.bottom + GAP, H - 180) + 'px', left: left + 'px', width: TW + 'px' }
  }
  if (step.value.position === 'right') {
    const top = Math.min(Math.max(8, r.top), H - 200)
    return { top: top + 'px', left: Math.min(r.right + GAP, W - TW - 8) + 'px', width: TW + 'px' }
  }
  // left
  const top = Math.min(Math.max(8, r.top), H - 200)
  return { top: top + 'px', right: Math.min(W - r.left + GAP, W - TW - 8) + 'px', width: TW + 'px' }
})

// Arrow del tooltip
const arrowClass = computed(() => {
  const pos = step.value.position
  if (pos === 'bottom') return 'arrow-top'
  if (pos === 'right')  return 'arrow-left'
  return 'arrow-right'
})

// Overlays: top / bottom / left / right
const overlays = computed(() => {
  if (!rect.value) return []
  const r = rect.value
  const W = window.innerWidth
  const H = window.innerHeight
  return [
    { top: 0,         left: 0,       width: W,         height: r.top },            // top
    { top: r.bottom,  left: 0,       width: W,         height: H - r.bottom },     // bottom
    { top: r.top,     left: 0,       width: r.left,    height: r.height },          // left
    { top: r.top,     left: r.right, width: W - r.right, height: r.height },       // right
  ]
})
</script>

<template>
  <Teleport to="body">

    <!-- Overlays oscuros (4 rectángulos alrededor del spotlight) -->
    <div
      v-for="(o, i) in overlays"
      :key="i"
      class="tour-overlay"
      :style="{
        top:    o.top    + 'px',
        left:   o.left   + 'px',
        width:  o.width  + 'px',
        height: o.height + 'px',
      }"
      @click="close"
    />

    <!-- Borde iluminado alrededor del elemento -->
    <div
      v-if="rect"
      class="tour-spotlight"
      :style="{
        top:    rect.top    + 'px',
        left:   rect.left   + 'px',
        width:  rect.width  + 'px',
        height: rect.height + 'px',
      }"
    />

    <!-- Tooltip -->
    <div class="tour-tooltip" :class="arrowClass" :style="tooltipStyle">

      <!-- Header del tooltip -->
      <div class="tt-head">
        <span class="tt-step">{{ currentStep + 1 }} / {{ STEPS.length }}</span>
        <span class="tt-title">{{ step.title }}</span>
        <button class="tt-close" @click="close" aria-label="Cerrar tutorial">
          <X :size="14" />
        </button>
      </div>

      <p class="tt-text">{{ step.text }}</p>

      <!-- Dots de progreso -->
      <div class="tt-dots">
        <span
          v-for="(_, i) in STEPS"
          :key="i"
          class="tt-dot"
          :class="{ active: i === currentStep, done: i < currentStep }"
          @click="goTo(i)"
        />
      </div>

      <!-- Navegación -->
      <div class="tt-nav">
        <button class="tt-btn tt-btn--ghost" @click="close">Saltar</button>
        <div class="tt-nav-arrows">
          <button class="tt-btn tt-btn--icon" :disabled="currentStep === 0" @click="prev">
            <ChevronLeft :size="16" />
          </button>
          <button class="tt-btn tt-btn--primary" @click="next">
            {{ currentStep === STEPS.length - 1 ? 'Finalizar' : 'Siguiente' }}
            <ChevronRight v-if="currentStep < STEPS.length - 1" :size="15" />
          </button>
        </div>
      </div>

    </div>

  </Teleport>
</template>

<style scoped>
/* Overlays oscuros */
.tour-overlay {
  position: fixed;
  background: rgba(5, 30, 18, 0.72);
  z-index: 9100;
  cursor: pointer;
  transition: all .3s ease;
}

/* Borde spotlight */
.tour-spotlight {
  position: fixed;
  z-index: 9101;
  border-radius: 14px;
  pointer-events: none;
  box-shadow:
    0 0 0 2px rgba(63, 173, 114, 0.9),
    0 0 0 4px rgba(63, 173, 114, 0.25),
    0 0 24px rgba(63, 173, 114, 0.4);
  transition: top .35s cubic-bezier(.34,1.10,.64,1),
              left .35s cubic-bezier(.34,1.10,.64,1),
              width .35s cubic-bezier(.34,1.10,.64,1),
              height .35s cubic-bezier(.34,1.10,.64,1);
  animation: pulse-ring 2s ease-in-out infinite;
}

@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 0 2px rgba(63,173,114,.9), 0 0 0 4px rgba(63,173,114,.25), 0 0 24px rgba(63,173,114,.4); }
  50%       { box-shadow: 0 0 0 2px rgba(63,173,114,.9), 0 0 0 7px rgba(63,173,114,.15), 0 0 36px rgba(63,173,114,.55); }
}

/* Tooltip */
.tour-tooltip {
  position: fixed;
  z-index: 9200;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(63, 173, 114, 0.35);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow:
    0 8px 32px rgba(11, 86, 64, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255,255,255,0.9);
  animation: tt-in .3s cubic-bezier(.34,1.10,.64,1) both;
}

@keyframes tt-in {
  from { opacity: 0; transform: scale(.93) translateY(6px); }
  to   { opacity: 1; transform: scale(1)   translateY(0); }
}

/* Arrow indicators */
.tour-tooltip::before {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  background: rgba(255,255,255,0.97);
  border: 1px solid rgba(63,173,114,0.35);
  transform: rotate(45deg);
}
.arrow-top::before    { top: -6px;  left: 20px; border-right: none; border-bottom: none; }
.arrow-left::before   { left: -6px; top: 18px;  border-right: none; border-top: none; }
.arrow-right::before  { right: -6px; top: 18px; border-left: none; border-bottom: none; }

/* Cabecera */
.tt-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tt-step {
  font-family: 'Prompt', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #3fad72;
  background: rgba(63,173,114,0.12);
  padding: 2px 7px;
  border-radius: 99px;
  flex-shrink: 0;
}
.tt-title {
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #0b5640;
  flex: 1;
}
.tt-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(107,114,128,0.1);
  color: #6b7280;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s, color .15s;
  padding: 0;
}
.tt-close:hover {
  background: rgba(239,68,68,0.12);
  color: #ef4444;
}

/* Texto */
.tt-text {
  margin: 0;
  font-family: 'Prompt', sans-serif;
  font-size: 12.5px;
  color: #374151;
  line-height: 1.6;
}

/* Dots */
.tt-dots {
  display: flex;
  gap: 5px;
  align-items: center;
}
.tt-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d1e9d8;
  cursor: pointer;
  transition: background .2s, transform .2s;
}
.tt-dot.done    { background: #3fad72; }
.tt-dot.active  { background: #0b5640; transform: scale(1.4); }

/* Navegación */
.tt-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 4px;
  border-top: 1px solid rgba(63,173,114,0.15);
}
.tt-nav-arrows {
  display: flex;
  align-items: center;
  gap: 6px;
}
.tt-btn {
  font-family: 'Prompt', sans-serif;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background .15s, color .15s, opacity .15s;
  display: flex;
  align-items: center;
  gap: 4px;
}
.tt-btn--ghost {
  background: transparent;
  color: #9ca3af;
  padding: 5px 8px;
}
.tt-btn--ghost:hover { color: #374151; }

.tt-btn--icon {
  background: rgba(63,173,114,0.1);
  color: #0b5640;
  padding: 5px 8px;
  border: 1px solid rgba(63,173,114,0.2);
}
.tt-btn--icon:hover:not(:disabled) { background: rgba(63,173,114,0.2); }
.tt-btn--icon:disabled { opacity: 0.3; cursor: default; }

.tt-btn--primary {
  background: linear-gradient(135deg, #3fad72 0%, #0b5640 100%);
  color: #fff;
  padding: 6px 14px;
  box-shadow: 0 2px 8px rgba(11,86,64,0.25);
}
.tt-btn--primary:hover {
  background: linear-gradient(135deg, #4fc47f 0%, #0d6b4e 100%);
  box-shadow: 0 4px 12px rgba(11,86,64,0.35);
}
</style>
