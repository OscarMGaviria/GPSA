<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Array de { label, value (0-100), color? }
  axes: { type: Array, default: () => [] },
  size: { type: Number, default: 180 },
})

const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)
const R  = computed(() => props.size * 0.38)

const N = computed(() => props.axes.length)

// Ángulo de cada eje (arriba = -90°)
function angle(i) {
  return (2 * Math.PI * i) / N.value - Math.PI / 2
}

// Punto en el polígono de referencia (pct 0-1)
function point(i, pct) {
  const a = angle(i)
  const r = R.value * pct
  return {
    x: cx.value + r * Math.cos(a),
    y: cy.value + r * Math.sin(a),
  }
}

// Polígonos de fondo (niveles 25, 50, 75, 100)
const levels = [0.25, 0.5, 0.75, 1]
function levelPolygon(pct) {
  return Array.from({ length: N.value }, (_, i) => {
    const p = point(i, pct)
    return `${p.x},${p.y}`
  }).join(' ')
}

// Líneas de cada eje
const axisLines = computed(() =>
  Array.from({ length: N.value }, (_, i) => ({
    x1: cx.value,
    y1: cy.value,
    x2: point(i, 1).x,
    y2: point(i, 1).y,
  }))
)

// Polígono de datos
const dataPolygon = computed(() =>
  props.axes.map((ax, i) => {
    const p = point(i, (ax.value ?? 0) / 100)
    return `${p.x},${p.y}`
  }).join(' ')
)

// Posición de etiquetas (un poco más afuera del radio)
const labelPositions = computed(() =>
  props.axes.map((ax, i) => {
    const a = angle(i)
    const r = R.value * 1.28
    return {
      x:    cx.value + r * Math.cos(a),
      y:    cy.value + r * Math.sin(a),
      label: ax.label,
      value: ax.value,
      anchor: Math.cos(a) > 0.1 ? 'start' : Math.cos(a) < -0.1 ? 'end' : 'middle',
    }
  })
)

// Puntos del polígono de datos (para los dots)
const dataDots = computed(() =>
  props.axes.map((ax, i) => point(i, (ax.value ?? 0) / 100))
)
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="radar-svg">

    <!-- Polígonos de fondo -->
    <polygon
      v-for="(lv, li) in levels"
      :key="li"
      :points="levelPolygon(lv)"
      class="radar-level"
    />

    <!-- Líneas de ejes -->
    <line
      v-for="(ax, i) in axisLines"
      :key="'ax-' + i"
      :x1="ax.x1" :y1="ax.y1"
      :x2="ax.x2" :y2="ax.y2"
      class="radar-axis"
    />

    <!-- Polígono de datos -->
    <polygon :points="dataPolygon" class="radar-data" />

    <!-- Dots en cada vértice -->
    <circle
      v-for="(d, i) in dataDots"
      :key="'dot-' + i"
      :cx="d.x" :cy="d.y"
      r="3.5"
      class="radar-dot"
    />

    <!-- Etiquetas -->
    <text
      v-for="lp in labelPositions"
      :key="lp.label"
      :x="lp.x"
      :y="lp.y"
      :text-anchor="lp.anchor"
      dominant-baseline="middle"
      class="radar-label"
    >{{ lp.label }}</text>

    <!-- Valores -->
    <text
      v-for="(lp, i) in labelPositions"
      :key="'val-' + i"
      :x="lp.x"
      :y="lp.y + 11"
      :text-anchor="lp.anchor"
      dominant-baseline="middle"
      class="radar-value"
    >{{ lp.value }}%</text>

  </svg>
</template>

<style scoped>
.radar-svg { overflow: visible; }

.radar-level {
  fill: rgba(45, 134, 83, 0.06);
  stroke: rgba(45, 134, 83, 0.2);
  stroke-width: 1;
}

.radar-axis {
  stroke: rgba(45, 134, 83, 0.25);
  stroke-width: 1;
}

.radar-data {
  fill: rgba(11, 86, 64, 0.22);
  stroke: #0b5640;
  stroke-width: 2;
  stroke-linejoin: round;
}

.radar-dot {
  fill: #0b5640;
  stroke: #fff;
  stroke-width: 1.5;
}

.radar-label {
  font-family: 'Prompt', sans-serif;
  font-size: 8px;
  font-weight: 700;
  fill: #374151;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.radar-value {
  font-family: 'Prompt', sans-serif;
  font-size: 9px;
  font-weight: 800;
  fill: #0b5640;
}
</style>
