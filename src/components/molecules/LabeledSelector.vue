<script setup>
import Selector from '../atoms/Selector.vue'

defineProps({
  label:      { type: String, required: true },
  options:    { type: Array,  required: true },
  modelValue: { type: String, default: '' },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="labeled-selector">
    <span class="ls-label">{{ label }}</span>
    <Selector
      :options="options"
      :modelValue="modelValue"
      @update:modelValue="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<style scoped>
.labeled-selector {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ls-label {
  font-size: 10px;
  font-family: 'Prompt', sans-serif;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding-left: 2px;
}
</style>
