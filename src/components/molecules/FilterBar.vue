<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Search, X } from 'lucide-vue-next'
import Selector from '../atoms/Selector.vue'

const props = defineProps({
  subregionOptions: { type: Array, default: () => ['Todas las subregiones'] },
  municipioOptions: { type: Array, default: () => ['Todos los municipios'] },
  circuitoOptions:  { type: Array, default: () => ['Todos los circuitos'] },
})

const emit = defineEmits(['filter-change'])

const searchText   = ref('')
const subregionVal = ref(props.subregionOptions[0])
const municipioVal = ref(props.municipioOptions[0])
const circuitoVal  = ref(props.circuitoOptions[0])

watch(subregionVal, () => {
  municipioVal.value = props.municipioOptions[0]
  emitFilters()
})

const emitFilters = () => {
  emit('filter-change', {
    search:    searchText.value,
    subregion: subregionVal.value,
    municipio: municipioVal.value,
    circuito:  circuitoVal.value,
  })
}

const clearFilters = () => {
  searchText.value   = ''
  subregionVal.value = props.subregionOptions[0]
  municipioVal.value = props.municipioOptions[0]
  circuitoVal.value  = props.circuitoOptions[0]
  emitFilters()
}

const onKeydown = (e) => { if (e.key === 'Escape') clearFilters() }
onMounted(()   => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="filter-bar">
    <div class="search-wrapper">
      <Search :size="14" class="search-icon" />
      <input
        v-model="searchText"
        type="text"
        placeholder="Buscar vía..."
        class="search-input"
        @input="emitFilters"
      />
    </div>

    <Selector v-model="subregionVal" :options="subregionOptions" @update:modelValue="emitFilters" />
    <Selector v-model="municipioVal" :options="municipioOptions" @update:modelValue="emitFilters" />
    <Selector v-model="circuitoVal"  :options="circuitoOptions"  @update:modelValue="emitFilters" />

    <div class="btn-clear-wrapper">
      <button class="btn-clear" @click="clearFilters" aria-label="Borrar filtros">
        <X :size="14" />
      </button>
      <span class="btn-tooltip">Borrar filtros</span>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.search-wrapper:hover { transform: translateY(-1px); }

.search-icon {
  position: absolute;
  left: 10px;
  color: rgba(255, 255, 255, 0.45);
  pointer-events: none;
  transition: color 0.2s;
  z-index: 1;
}
.search-wrapper:hover .search-icon,
.search-wrapper:focus-within .search-icon { color: rgba(255, 255, 255, 0.85); }

.search-input {
  padding: 7.5px 12px 7.5px 32px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  font-size: 13px;
  font-family: 'Prompt', sans-serif;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
  width: 162px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 16px rgba(0,0,0,0.12);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(20px) saturate(160%);
}
.search-input::placeholder { color: rgba(255, 255, 255, 0.35); }
.search-input:hover {
  background: rgba(255, 255, 255, 0.13);
  border-color: rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 20px rgba(0,0,0,0.15);
}
.search-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 3px rgba(255,255,255,0.1), 0 6px 20px rgba(0,0,0,0.15);
}

.btn-clear-wrapper {
  position: relative;
  display: inline-flex;
}
.btn-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  outline: none;
}
.btn-clear:hover {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(248, 113, 113, 0.5);
  color: #fca5a5;
}
.btn-clear:active {
  background: rgba(239, 68, 68, 0.28);
  border-color: rgba(248, 113, 113, 0.7);
}

.btn-tooltip {
  position: absolute;
  top: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: #f9fafb;
  font-size: 11.5px;
  font-family: 'Prompt', sans-serif;
  white-space: nowrap;
  padding: 4px 9px;
  border-radius: 5px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 300;
}
.btn-tooltip::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: #1f2937;
}
.btn-clear-wrapper:hover .btn-tooltip { opacity: 1; }
</style>
