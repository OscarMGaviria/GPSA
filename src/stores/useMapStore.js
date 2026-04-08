import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useMapStore = defineStore('map', () => {
  const activeFilters = ref({
    search:    '',
    subregion: 'Todas las subregiones',
    municipio: 'Todos los municipios',
    circuito:  'Todos los circuitos',
  })

  const filterOptions = ref({
    subregiones:            ['Todas las subregiones'],
    municipios:             ['Todos los municipios'],
    circuitos:              ['Todos los circuitos'],
    municipiosPorSubregion: {},
  })

  const mapStats = ref({
    viasIntervenidas: 0,
    longitudTotal:    0,
    municipios:       0,
    circuitos:        0,
    subregiones:      [],
    viasDetalle:      [],
  })

  const mapLoading = ref(true)
  function setMapLoading(val) { mapLoading.value = val }

  const filteredMunicipioOptions = computed(() => {
    const sub = activeFilters.value.subregion
    if (!sub || sub === 'Todas las subregiones') return filterOptions.value.municipios
    const lista = filterOptions.value.municipiosPorSubregion[sub] ?? []
    return ['Todos los municipios', ...lista]
  })

  function setFilter(filters) {
    if (filters.subregion !== activeFilters.value.subregion) {
      filters.municipio = 'Todos los municipios'
    }
    activeFilters.value = filters
  }

  function setFilterOptions(options) { filterOptions.value = options }
  function setMapStats(stats)        { mapStats.value = stats }

  return {
    activeFilters,
    filterOptions,
    mapStats,
    mapLoading,
    filteredMunicipioOptions,
    setFilter,
    setFilterOptions,
    setMapStats,
    setMapLoading,
  }
})
