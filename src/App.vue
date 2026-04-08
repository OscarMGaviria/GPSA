<script setup>
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader  from './components/organisms/AppHeader.vue'
import MapView    from './components/organisms/MapView.vue'
import StatsPanel from './components/organisms/StatsPanel.vue'
import { useMapStore } from './stores/useMapStore.js'

const store = useMapStore()
const { activeFilters, filterOptions, mapStats, filteredStats, mapLoading, filteredMunicipioOptions } = storeToRefs(store)
const isPanelOpen = ref(true)

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
    <AppHeader
      @filter-change="store.setFilter"
      :panel-open="isPanelOpen"
      @toggle-panel="isPanelOpen = !isPanelOpen"
      :subregion-options="filterOptions.subregiones"
      :municipio-options="filteredMunicipioOptions"
      :circuito-options="filterOptions.circuitos"
    />
    <div class="content-area">
      <MapView />
      <StatsPanel
        :is-open="isPanelOpen"
        :loading="mapLoading"
        :vias-intervenidas="filteredStats.viasIntervenidas"
        :longitud-total="filteredStats.longitudTotal"
        :municipios="filteredStats.municipios"
        :circuitos="filteredStats.circuitos"
        :subregiones="mapStats.subregiones"
        :vias-detalle="filteredStats.viasDetalle"
        :active-subregion="activeChartSubregion"
        @filter-subregion="sub => store.setFilter({ ...activeFilters, subregion: sub, municipio: 'Todos los municipios' })"
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
</style>
