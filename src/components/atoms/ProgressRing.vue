<script setup>
import { computed } from 'vue'

const props = defineProps({
  pct:       { type: Number, default: 0 },   // 0–100
  size:      { type: Number, default: 120 },
  stroke:    { type: Number, default: 9 },
  color:     { type: String, default: '#2d8653' },
  trackColor:{ type: String, default: '#d1fae5' },
  label:     { type: String, default: '' },
  sublabel:  { type: String, default: '' },
})

const r   = computed(() => (props.size - props.stroke) / 2)
const circ = computed(() => 2 * Math.PI * r.value)
const dash = computed(() => (props.pct / 100) * circ.value)
const cx   = computed(() => props.size / 2)
</script>

<template>
  <div class="ring-wrap" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :width="size" :height="size" class="ring-svg">
      <!-- track -->
      <circle
        :cx="cx" :cy="cx" :r="r"
        fill="none"
        :stroke="trackColor"
        :stroke-width="stroke"
      />
      <!-- progress -->
      <circle
        :cx="cx" :cy="cx" :r="r"
        fill="none"
        :stroke="color"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="`${dash} ${circ}`"
        :stroke-dashoffset="0"
        transform="rotate(-90)"
        :transform-origin="`${cx}px ${cx}px`"
        class="ring-arc"
      />
    </svg>
    <div class="ring-center">
      <span class="ring-pct">{{ pct }}<span class="ring-sym">%</span></span>
      <span v-if="label" class="ring-label">{{ label }}</span>
    </div>
    <div v-if="sublabel" class="ring-sublabel">{{ sublabel }}</div>
  </div>
</template>

<style scoped>
.ring-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ring-svg {
  display: block;
}
.ring-arc {
  transition: stroke-dasharray 0.7s cubic-bezier(.4,0,.2,1);
}
.ring-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}
.ring-pct {
  font-size: 26px;
  font-weight: 800;
  color: #1a3c2d;
  display: flex;
  align-items: baseline;
  gap: 1px;
}
.ring-sym {
  font-size: 14px;
  font-weight: 700;
}
.ring-label {
  font-size: 10px;
  color: #6b7280;
  margin-top: 2px;
  font-weight: 500;
  white-space: nowrap;
}
.ring-sublabel {
  font-size: 10px;
  color: #9ca3af;
  margin-top: 6px;
  text-align: center;
  line-height: 1.3;
}
</style>
