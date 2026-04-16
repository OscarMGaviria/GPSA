<script setup>
defineProps({
  title:   { type: String, required: true },
  value:   { type: [String, Number], required: true },
  unit:    { type: String, default: '' },
  tooltip: { type: String, default: '' },
})
</script>

<template>
  <div class="stat-card">
    <div class="icon-wrap">
      <slot />
    </div>
    <div class="card-metric">
      <span class="card-value">{{ value }}</span>
      <span v-if="unit" class="card-unit">{{ unit }}</span>
    </div>
    <div class="card-title">
      {{ title }}
      <span v-if="tooltip" class="card-info" :data-tip="tooltip" @click.stop>ⓘ</span>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(200, 223, 208, 0.55);
  border-radius: 16px;
  padding: 14px 10px 12px;
  box-shadow:
    0 2px 8px rgba(45, 134, 83, 0.08),
    0 1px 3px rgba(0,0,0,.05);
  text-align: center;
  min-width: 0;
  cursor: pointer;
  position: relative;
  z-index: 0;
  transition: transform .18s ease-out, box-shadow .18s ease-out, background .18s ease-out, z-index 0s;
}
.stat-card:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
@media (hover: hover) and (pointer: fine) {
  .stat-card:hover {
    transform: translateY(-4px) scale(1.02);
    background: rgba(255, 255, 255, 0.92);
    box-shadow:
      0 8px 24px rgba(45, 134, 83, 0.14),
      0 2px 6px rgba(0,0,0,.07);
    z-index: 10;
  }
}
.icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: rgba(212, 234, 216, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2d8653;
  margin-bottom: 1px;
}
.card-metric {
  display: flex;
  align-items: baseline;
  gap: 3px;
  line-height: 1;
}
.card-value {
  font-size: 34px;
  font-weight: 800;
  color: #2d8653;
  line-height: 1;
}
.card-unit {
  font-size: 15px;
  font-weight: 700;
  color: #2d8653;
}
.card-title {
  font-size: 10px;
  font-weight: 700;
  color: #7a8f99;
  letter-spacing: .3px;
  line-height: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}
.card-info {
  font-size: 10px;
  color: #b0bec5;
  cursor: default;
  position: relative;
  flex-shrink: 0;
}
.card-info::after {
  content: attr(data-tip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) scale(0.9);
  background: #1f2937;
  color: #f9fafb;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.4;
  padding: 5px 9px;
  border-radius: 7px;
  white-space: nowrap;
  max-width: 200px;
  white-space: normal;
  text-align: center;
  width: max-content;
  max-width: 180px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
  letter-spacing: 0;
  z-index: 100;
}
@media (hover: hover) and (pointer: fine) {
  .card-info:hover::after {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .stat-card { transition: none; }
  .stat-card:active { transform: none; }
}
</style>
