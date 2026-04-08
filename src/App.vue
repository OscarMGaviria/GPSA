<script setup>
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader  from './components/organisms/AppHeader.vue'
import MapView    from './components/organisms/MapView.vue'
import StatsPanel from './components/organisms/StatsPanel.vue'
import { useMapStore } from './stores/useMapStore.js'

const store = useMapStore()
const { activeFilters, filterOptions, mapStats, mapLoading, filteredMunicipioOptions } = storeToRefs(store)
const isPanelOpen = ref(true)

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
        :vias-intervenidas="mapStats.viasIntervenidas"
        :longitud-total="mapStats.longitudTotal"
        :municipios="mapStats.municipios"
        :circuitos="mapStats.circuitos"
        :subregiones="mapStats.subregiones"
        :vias-detalle="mapStats.viasDetalle"
        :active-subregion="activeFilters.subregion"
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
