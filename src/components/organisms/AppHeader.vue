<script setup>
import { ref, computed } from 'vue'
import { HelpCircle, SlidersHorizontal, X } from '@lucide/vue'
import FilterBar from '../molecules/FilterBar.vue'

const escudoSrc  = import.meta.env.BASE_URL + 'Escudo de armas.png'

const props = defineProps({
  title:            { type: String,  default: 'Gestión Predial Social y Ambiental' },
  subtitle:         { type: String,  default: 'GPSA' },
  subregionOptions: { type: Array,   default: () => ['Todas las subregiones'] },
  municipioOptions: { type: Array,   default: () => ['Todos los municipios'] },
  proyectoOptions:  { type: Array,   default: () => ['Todos los proyectos'] },

  activeFilters:    { type: Object,  default: null },
})

const emit = defineEmits(['filter-change', 'start-tour'])

const isMobileDrawerOpen = ref(false)

const activeFiltersCount = computed(() => {
  if (!props.activeFilters) return 0
  let count = 0
  if (props.activeFilters.search) count++
  if (props.activeFilters.subregion && props.activeFilters.subregion !== 'Todas las subregiones') count++
  if (props.activeFilters.municipio && props.activeFilters.municipio !== 'Todos los municipios') count++
  if (props.activeFilters.proyecto && props.activeFilters.proyecto !== 'Todos los proyectos') count++
  return count
})
</script>

<template>
  <header class="app-header">

    <!-- LEFT: logo + branding -->
    <div class="header-brand">
      <div class="header-logo">
        <img :src="escudoSrc" alt="Gobernación de Antioquia" class="header-logo-img" fetchpriority="high" />
      </div>
      <div class="header-titles">
        <h1 class="header-title">{{ title }}</h1>
        <p class="header-subtitle desktop-only">{{ subtitle }}</p>
        <p class="header-subtitle mobile-only">GPSA</p>
      </div>
    </div>

    <div class="header-divider"></div>

    <!-- RIGHT: filters + panel toggle (Desktop Only) -->
    <div class="header-filters desktop-only">
      <FilterBar
        :subregion-options="subregionOptions"
        :municipio-options="municipioOptions"
        :proyecto-options="proyectoOptions"
        :active-filters="activeFilters"
        @filter-change="emit('filter-change', $event)"
      />

      <div class="header-sep"></div>

      <div class="btn-panel-wrapper">
        <button
          class="btn-panel"
          @click="emit('start-tour')"
          aria-label="Abrir tutorial"
        >
          <HelpCircle :size="15" />
        </button>
        <span class="btn-tooltip">¿Cómo usar SIMEVA?</span>
      </div>


    </div>

    <!-- RIGHT: Mobile actions (Mobile Only) -->
    <div class="header-mobile-actions mobile-only">
      <button class="btn-mobile-filter" @click="isMobileDrawerOpen = true">
        <SlidersHorizontal :size="15" />
        <span>Filtros</span>
        <span v-if="activeFiltersCount > 0" class="filter-badge">{{ activeFiltersCount }}</span>
      </button>
    </div>

    <!-- Mobile Drawer Overlay -->
    <Transition name="drawer-fade">
      <div v-if="isMobileDrawerOpen" class="drawer-backdrop" @click="isMobileDrawerOpen = false">
        <div class="drawer-content" @click.stop>
          <div class="drawer-header">
            <div class="drawer-title-wrapper">
              <h2 class="drawer-title">Filtros de Búsqueda</h2>
              <p class="drawer-subtitle">Filtra los proyectos por subregión, municipio o proyecto</p>
            </div>
            <button class="drawer-close" @click="isMobileDrawerOpen = false" aria-label="Cerrar filtros">
              <X :size="18" />
            </button>
          </div>
          <div class="drawer-body">
            <FilterBar
              :subregion-options="subregionOptions"
              :municipio-options="municipioOptions"
              :proyecto-options="proyectoOptions"
              :active-filters="activeFilters"
              @filter-change="emit('filter-change', $event)"
              @close="isMobileDrawerOpen = false"
            />
          </div>
        </div>
      </div>
    </Transition>

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
  z-index: 100;
  overflow: visible;
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

/* Mobile styling controls */
.mobile-only {
  display: none !important;
}

@media (max-width: 1024px) {
  .desktop-only {
    display: none !important;
  }
  .mobile-only {
    display: flex !important;
  }
  .app-header {
    padding: 10px 16px;
    gap: 12px;
    width: 100%;
    box-sizing: border-box;
  }
  .header-brand {
    flex: 1;
    min-width: 0;
    gap: 10px;
  }
  .header-titles {
    min-width: 0;
    flex: 1;
  }
  .header-logo-img {
    height: 40px;
  }
  .header-title {
    font-size: 13.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .header-subtitle {
    font-size: 9.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .header-divider {
    display: none;
  }
}

.header-mobile-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-mobile-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  color: #ffffff;
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  height: 36px;
}
.btn-mobile-filter:active {
  background: rgba(255, 255, 255, 0.25);
}

.filter-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  padding: 0 4px;
  box-sizing: border-box;
}

/* Filter Modal overlay styling */
.drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.drawer-content {
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 20px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.drawer-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-title {
  margin: 0;
  font-family: 'Prompt', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.drawer-subtitle {
  margin: 0;
  font-family: 'Prompt', sans-serif;
  font-size: 12px;
  color: #64748b;
}

.drawer-close {
  background: #f1f5f9;
  border: none;
  color: #475569;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
}
.drawer-close:active {
  background: #e2e8f0;
}

.drawer-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.drawer-footer {
  padding: 16px 20px;
  border-top: 1px solid #f1f5f9;
  background: #f8fafc;
}

.btn-apply {
  width: 100%;
  height: 48px;
  background: #0b5640;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-family: 'Prompt', sans-serif;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-apply:active {
  background: #0a4d38;
}

/* Animations */
@keyframes modalZoomIn {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes modalZoomOut {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.95);
    opacity: 0;
  }
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.drawer-fade-enter-active .drawer-content {
  animation: modalZoomIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.drawer-fade-leave-active .drawer-content {
  animation: modalZoomOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
