<script setup>
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Search, X } from '@lucide/vue'
import Selector from '../atoms/Selector.vue'

const props = defineProps({
  subregionOptions: { type: Array,  default: () => ['Todas las subregiones'] },
  municipioOptions: { type: Array,  default: () => ['Todos los municipios'] },
  proyectoOptions:  { type: Array,  default: () => ['Todos los proyectos'] },
  activeFilters:    { type: Object, default: null },
})

const emit = defineEmits(['filter-change', 'close'])

const PROYECTO_GROUP_DEFS = [
  { label: 'PAP', match: n => /^pap\b/i.test(n) },
  { label: 'Puentes', match: n => /^puente/i.test(n) },
]

// Proyectos cuyo nombre no sigue la convención "PAP ..." / "Puente ..." pero sí pertenecen a un grupo.
const PROYECTO_OVERRIDES = {
  'mi casita venecia': 'Puentes',
}

// Agrupa los proyectos por PAP o Puentes; lo que no encaje en ninguno cae en "Otros".
const proyectoGroups = computed(() => {
  const rest = props.proyectoOptions.slice(1)
  const groups = PROYECTO_GROUP_DEFS.map(def => ({ label: def.label, options: [] }))
  const otros = []
  for (const name of rest) {
    const overrideLabel = PROYECTO_OVERRIDES[name.toLowerCase()]
    const groupIdx = overrideLabel
      ? PROYECTO_GROUP_DEFS.findIndex(def => def.label === overrideLabel)
      : PROYECTO_GROUP_DEFS.findIndex(def => def.match(name))
    if (groupIdx !== -1) groups[groupIdx].options.push(name)
    else otros.push(name)
  }
  if (otros.length) groups.push({ label: 'Otros', options: otros })
  return groups.filter(g => g.options.length)
})

const searchText   = ref(props.activeFilters?.search ?? '')
const subregionVal = ref(props.activeFilters?.subregion ?? props.subregionOptions[0])
const municipioVal = ref(props.activeFilters?.municipio ?? props.municipioOptions[0])
const proyectoVal  = ref(props.activeFilters?.proyecto ?? props.proyectoOptions[0])

let isSyncing = false

// Sincronizar estado local cuando los filtros cambian externamente (ej: click en gráfica)
watch(() => props.activeFilters, (f) => {
  if (!f) return
  isSyncing = true
  searchText.value   = f.search    ?? ''
  subregionVal.value = f.subregion ?? props.subregionOptions[0]
  municipioVal.value = f.municipio ?? props.municipioOptions[0]
  proyectoVal.value  = f.proyecto  ?? props.proyectoOptions[0]
  nextTick(() => {
    isSyncing = false
  })
}, { immediate: true, deep: true })

watch(subregionVal, () => {
  if (isSyncing) return
  municipioVal.value = props.municipioOptions[0]
  proyectoVal.value  = props.proyectoOptions[0]
  emitFilters()
})

const emitFilters = () => {
  emit('filter-change', {
    search:    searchText.value,
    subregion: subregionVal.value,
    municipio: municipioVal.value,
    proyecto:  proyectoVal.value,
  })
}

const clearFilters = () => {
  searchText.value   = ''
  subregionVal.value = props.subregionOptions[0]
  municipioVal.value = props.municipioOptions[0]
  proyectoVal.value  = props.proyectoOptions[0]
  emitFilters()
}

const hasActiveFilters = computed(() => {
  const hasSearch = searchText.value.trim() !== ''
  const hasSubregion = subregionVal.value && subregionVal.value !== props.subregionOptions[0]
  const hasMunicipio = municipioVal.value && municipioVal.value !== props.municipioOptions[0]
  const hasProyecto = proyectoVal.value && proyectoVal.value !== props.proyectoOptions[0]
  return hasSearch || hasSubregion || hasMunicipio || hasProyecto
})

const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = globalThis.innerWidth <= 1024
}

const onKeydown = (e) => { if (e.key === 'Escape') clearFilters() }
onMounted(()   => {
  globalThis.addEventListener('keydown', onKeydown)
  checkMobile()
  globalThis.addEventListener('resize', checkMobile)
})
onUnmounted(() => {
  globalThis.removeEventListener('keydown', onKeydown)
  globalThis.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="filter-bar">
    <div v-if="!isMobile" class="search-wrapper">
      <Search :size="14" class="search-icon" />
      <input
        v-model="searchText"
        type="text"
        placeholder="Buscar vía..."
        class="search-input"
        @input="emitFilters"
      />
    </div>

    <Selector v-model="subregionVal" :options="subregionOptions" @update:modelValue="emitFilters" align="right" />
    <Selector v-model="municipioVal" :options="municipioOptions" @update:modelValue="emitFilters" align="right" />
    <Selector v-model="proyectoVal"  :options="proyectoOptions" :groups="proyectoGroups" @update:modelValue="emitFilters" align="right" />

    <div v-if="!isMobile" class="btn-clear-wrapper">
      <button
        class="btn-clear"
        :disabled="!hasActiveFilters"
        @click="clearFilters"
        aria-label="Borrar filtros"
      >
        <X :size="14" />
      </button>
      <span class="btn-tooltip">Borrar filtros</span>
    </div>
    <div v-else class="filter-actions-mobile">
      <button
        class="btn-clear-mobile"
        :class="{ 'btn-clear-mobile--active': hasActiveFilters }"
        :disabled="!hasActiveFilters"
        @click="clearFilters"
        aria-label="Limpiar filtros"
      >
        Limpiar
      </button>
      <button
        class="btn-apply-mobile"
        @click="emit('close')"
        aria-label="Aplicar filtros"
      >
        Aplicar
      </button>
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
.btn-clear:disabled {
  opacity: 0.28;
  cursor: not-allowed;
  background: transparent;
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  pointer-events: none;
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

@media (max-width: 1024px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 12px;
  }
  .search-wrapper {
    width: 100%;
  }
  .search-input {
    width: 100%;
    box-sizing: border-box;
    font-size: 14px;
    padding: 10px 12px 10px 36px;
    color: #1f2937;
    background: #f3f4f6;
    border-color: #d1d5db;
    box-shadow: none;
  }
  .search-input::placeholder {
    color: #9ca3af;
  }
  .search-input:hover,
  .search-input:focus {
    background: #ffffff;
    border-color: #9ca3af;
    color: #1f2937;
    box-shadow: none;
  }
  .search-icon {
    color: #9ca3af;
  }
  .search-wrapper:hover .search-icon,
  .search-wrapper:focus-within .search-icon {
    color: #4b5563;
  }
  :deep(.select-container) {
    width: 100%;
  }
  :deep(.select-trigger) {
    width: 100%;
    padding: 10px 14px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    color: #1f2937;
    box-shadow: none;
    box-sizing: border-box;
    height: 40px;
  }
  :deep(.select-trigger:hover) {
    border-color: #9ca3af;
    background: #e5e7eb;
  }
  :deep(.trigger-arrow) {
    color: #6b7280;
  }
  :deep(.dropdown-panel) {
    width: 100% !important;
    position: relative !important;
    top: 0 !important;
    left: 0 !important;
    transform: none !important;
    box-shadow: none !important;
    border: 1px solid #e5e7eb !important;
    margin-top: 4px;
  }
  .btn-clear-wrapper {
    display: none !important;
  }
  .filter-actions-mobile {
    display: flex;
    gap: 10px;
    width: 100%;
    margin-top: 8px;
    box-sizing: border-box;
  }
  .btn-clear-mobile {
    flex: 35;
    height: 42px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #cbd5e1;
    border-radius: 10px;
    font-family: 'Prompt', sans-serif;
    font-size: 13.5px;
    font-weight: 700;
    cursor: not-allowed;
    transition: background 0.15s, border-color 0.15s, color 0.15s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .btn-clear-mobile.btn-clear-mobile--active {
    background: #fee2e2;
    border-color: #fca5a5;
    color: #ef4444;
    cursor: pointer;
  }
  .btn-clear-mobile.btn-clear-mobile--active:active {
    background: #fecaca;
    border-color: #f87171;
    transform: scale(0.97);
  }
  .btn-apply-mobile {
    flex: 65;
    height: 42px;
    background: linear-gradient(135deg, #1d7249 0%, #0d5f39 100%);
    border: none;
    color: #ffffff;
    border-radius: 10px;
    font-family: 'Prompt', sans-serif;
    font-size: 13.5px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(29, 114, 73, 0.2);
    transition: transform 0.1s, box-shadow 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .btn-apply-mobile:active {
    transform: scale(0.97);
    box-shadow: 0 2px 6px rgba(29, 114, 73, 0.15);
  }
}
</style>
