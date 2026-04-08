<script setup>
import { PanelRightClose, PanelRightOpen } from 'lucide-vue-next'
import FilterBar from '../molecules/FilterBar.vue'

const props = defineProps({
  title:            { type: String,  default: 'Pavimentación Vial' },
  subtitle:         { type: String,  default: 'SIMEVA — Sistema de Información y Monitoreo de vias' },
  subregionOptions: { type: Array,   default: () => ['Todas las subregiones'] },
  municipioOptions: { type: Array,   default: () => ['Todos los municipios'] },
  circuitoOptions:  { type: Array,   default: () => ['Todos los circuitos'] },
  panelOpen:        { type: Boolean, default: true },
})

const emit = defineEmits(['filter-change', 'toggle-panel'])
</script>

<template>
  <header class="app-header">

    <!-- LEFT: logo + branding -->
    <div class="header-brand">
      <div class="header-logo">
        <img src="/Escudo de armas.png" alt="Gobernación de Antioquia" class="header-logo-img" />
      </div>
      <div class="header-titles">
        <h1 class="header-title">{{ title }}</h1>
        <p class="header-subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div class="header-divider"></div>

    <!-- RIGHT: filters + panel toggle -->
    <div class="header-filters">
      <FilterBar
        :subregion-options="subregionOptions"
        :municipio-options="municipioOptions"
        :circuito-options="circuitoOptions"
        @filter-change="emit('filter-change', $event)"
      />

      <div class="header-sep"></div>

      <div class="btn-panel-wrapper">
        <button
          class="btn-panel"
          @click="emit('toggle-panel')"
          :aria-label="panelOpen ? 'Colapsar panel' : 'Expandir panel'"
        >
          <PanelRightClose v-if="panelOpen" :size="15" />
          <PanelRightOpen  v-else            :size="15" />
        </button>
        <span class="btn-tooltip">{{ panelOpen ? 'Colapsar panel' : 'Expandir panel' }}</span>
      </div>
    </div>

  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 14px 28px;
  width: 100%;
  box-sizing: border-box;
  background: linear-gradient(135deg, #0b5640 0%, #0d6b4e 60%, #0a4d38 100%);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.3);
  position: relative;
}

.app-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 60%);
  pointer-events: none;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
  position: relative;
}

.header-logo { flex-shrink: 0; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.25)); }
.header-logo-img { height: 60px; width: auto; display: block; object-fit: contain; }

.header-titles { display: flex; flex-direction: column; gap: 3px; }

.header-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  font-family: 'Prompt', sans-serif;
  line-height: 1.2;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 4px rgba(0,0,0,0.2);
}

.header-subtitle {
  margin: 0;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.58);
  font-family: 'Prompt', sans-serif;
  font-weight: 400;
  letter-spacing: 0.03em;
}

.header-divider {
  width: 1px;
  height: 34px;
  background: linear-gradient(180deg, transparent, rgba(255,255,255,0.2) 40%, rgba(255,255,255,0.2) 60%, transparent);
  flex-shrink: 0;
}

.header-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  position: relative;
}

.header-sep {
  width: 1px;
  height: 22px;
  background: rgba(255,255,255,0.18);
  flex-shrink: 0;
}

.btn-panel-wrapper {
  position: relative;
  display: inline-flex;
}

.btn-panel {
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
.btn-panel:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.4);
  color: #ffffff;
}
.btn-panel:active { background: rgba(255, 255, 255, 0.2); }

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
.btn-panel-wrapper:hover .btn-tooltip { opacity: 1; }
</style>
