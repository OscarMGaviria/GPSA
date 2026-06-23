<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader  from './components/organisms/AppHeader.vue'
import MapView    from './components/organisms/MapView.vue'
import StatsPanel from './components/organisms/StatsPanel.vue'
import AppTour    from './components/organisms/AppTour.vue'
import { useRouter } from 'vue-router'
import { useMapStore } from './stores/useMapStore.js'

const isInternal = import.meta.env.VITE_INTERNAL === 'true'

const store = useMapStore()
const { activeFilters, filterOptions, mapStats, filteredStats, mapLoading, filteredMunicipioOptions, filteredCircuitoOptions } = storeToRefs(store)
const router = isInternal ? useRouter() : null
const isPanelOpen = ref(true)
const showTour    = ref(localStorage.getItem('simeva-tour-done') !== '1')
const mapViewRef  = ref(null)

const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 1024
}
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Subregión activa en la gráfica: la seleccionada explícitamente,
// o la que corresponde al municipio seleccionado (inferida del mapa municipiosPorSubregion)
const activeChartSubregion = computed(() => {
  const sub = activeFilters.value.subregion
  if (sub && sub !== 'Todas las subregiones') return sub
  const mpio = activeFilters.value.municipio
  if (!mpio || mpio === 'Todos los municipios') return ''
  const mpioMap = filterOptions.value.municipiosPorSubregion
  for (const [subName, mpios] of Object.entries(mpioMap)) {
    if (mpios.some(m => m.toLowerCase() === mpio.toLowerCase())) return subName
  }
  return ''
})

// Sincronizar URL al cambiar filtros
watch(activeFilters, (f) => {
  const p = new URLSearchParams()
  if (f.search)    p.set('search',    f.search)
  if (f.subregion && f.subregion !== 'Todas las subregiones') p.set('subregion', f.subregion)
  if (f.municipio && f.municipio !== 'Todos los municipios')  p.set('municipio', f.municipio)
  if (f.circuito  && f.circuito  !== 'Todos los circuitos')   p.set('circuito',  f.circuito)
  const qs = p.toString()
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
}, { deep: true })
</script>

<template>
  <div id="app">

    <!-- ── Loading full-screen ── -->
    <Transition name="loader-fade">
      <div v-if="mapLoading" class="app-loader">
        <div class="loader-ring">
          <svg viewBox="0 0 50 50" class="loader-svg">
            <circle class="loader-track" cx="25" cy="25" r="20" />
            <circle class="loader-arc"   cx="25" cy="25" r="20" />
          </svg>
        </div>
        <span class="loader-text">Cargando datos…</span>
      </div>
    </Transition>

    <AppTour v-if="showTour && !isMobile" @close="showTour = false" />

    <AppHeader
      @filter-change="store.setFilter"
      :panel-open="isPanelOpen"
      @toggle-panel="isPanelOpen = !isPanelOpen"
      @start-tour="showTour = true"
      @generate-report="router.push('/reporte')"
      :subregion-options="filterOptions.subregiones"
      :municipio-options="filteredMunicipioOptions"
      :circuito-options="filteredCircuitoOptions"
      :active-filters="activeFilters"
    />
    <div class="content-area">
      <MapView ref="mapViewRef" />
      <StatsPanel
        :is-open="isPanelOpen"
        :loading="mapLoading"
        :vias-intervenidas="filteredStats.viasIntervenidas"
        :longitud-total="filteredStats.longitudTotal"
        :municipios="filteredStats.municipios"
        :circuitos="filteredStats.circuitos"
        :subregiones="mapStats.subregiones"
        :vias-detalle="filteredStats.viasDetalle"
        :total-vias-global="mapStats.viasIntervenidas"
        :total-km-global="mapStats.longitudTotal"
        :active-subregion="activeChartSubregion"
        @filter-subregion="sub => store.setFilter({ search: '', subregion: sub, municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })"
        @open-via="via => mapViewRef?.openVia(via)"
        @fly-via="via => mapViewRef?.flyToVia(via)"
      />
    </div>
  </div>
</template>

<style scoped>
#app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.content-area {
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .content-area {
    position: relative;
    flex-direction: column;
  }
}

/* ── Loading full-screen ── */
.app-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(234, 244, 237, 0.92);
  backdrop-filter: blur(6px);
}
.loader-ring {
  width: 64px;
  height: 64px;
  filter: drop-shadow(0 4px 12px rgba(26, 92, 58, 0.35));
}
.loader-svg {
  width: 100%;
  height: 100%;
  animation: spin 1.4s linear infinite;
}
.loader-track {
  fill: none;
  stroke: #c8e6d4;
  stroke-width: 4;
}
.loader-arc {
  fill: none;
  stroke: #1a5c3a;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 80 45;
  animation: dash 1.4s ease-in-out infinite;
}
.loader-text {
  font-family: 'Prompt', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #1a5c3a;
  letter-spacing: 0.3px;
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes dash  { 0% { stroke-dashoffset: 0; } 50% { stroke-dashoffset: -50; } 100% { stroke-dashoffset: -125; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.loader-fade-enter-active { transition: opacity .3s ease; }
.loader-fade-leave-active { transition: opacity .6s ease; }
.loader-fade-enter-from,
.loader-fade-leave-to     { opacity: 0; }
</style>
