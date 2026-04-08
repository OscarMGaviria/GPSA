<script setup>
defineProps({
  title: { type: String, required: true },
  value: { type: [String, Number], required: true },
  unit:  { type: String, default: '' },
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
    <div class="card-title">{{ title }}</div>
  </div>
</template>

<style scoped>
.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.42);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 14px 10px 12px;
  box-shadow:
    0 4px 16px rgba(45, 134, 83, 0.12),
    0 1px 4px rgba(0,0,0,.06),
    inset 0 1px 0 rgba(255,255,255,0.65);
  text-align: center;
  min-width: 0;
  cursor: pointer;
  transition: transform .22s ease, box-shadow .22s ease, background .22s ease;
}
.stat-card:hover {
  transform: translateY(-4px) scale(1.02);
  background: rgba(255, 255, 255, 0.75);
  box-shadow:
    0 10px 32px rgba(45, 134, 83, 0.2),
    0 3px 8px rgba(0,0,0,.08),
    inset 0 1px 0 rgba(255,255,255,0.8);
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
}
</style>
