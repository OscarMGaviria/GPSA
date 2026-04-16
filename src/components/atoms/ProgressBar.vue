<script setup>
defineProps({
  pct:         { type: Number, default: 0 },
  color:       { type: String, default: '#2d8653' },
  trackColor:  { type: String, default: '#d1fae5' },
  height:      { type: Number, default: 10 },
  showLabel:   { type: Boolean, default: true },
})
</script>

<template>
  <div class="pbar-wrap">
    <div v-if="showLabel" class="pbar-label">{{ pct }}%</div>
    <div class="pbar-track" :style="{ height: height + 'px', background: trackColor }">
      <div
        class="pbar-fill"
        :style="{ transform: 'scaleX(' + pct / 100 + ')', background: color }"
      />
    </div>
  </div>
</template>

<style scoped>
.pbar-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}
.pbar-label {
  font-size: 20px;
  font-weight: 800;
  color: #1a3c2d;
  line-height: 1;
}
.pbar-track {
  width: 100%;
  border-radius: 99px;
  overflow: hidden;
}
.pbar-fill {
  width: 100%;
  height: 100%;
  border-radius: 99px;
  transform-origin: left;
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
