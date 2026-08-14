import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useMapStore = defineStore('map', () => {
  const activeFilters = ref({
    search: '',
    puente: 'Todos los puentes',
    pap:    'Todos los PAP y otros',
  })

  const filterOptions = ref({
    puentes: ['Todos los puentes'],
    paps:    ['Todos los PAP y otros'],
  })

  const mapStats = ref({
    viasIntervenidas: 0,
    longitudTotal:    0,
    municipios:       0,
    proyectos:        0,
    subregiones:      [],
    viasDetalle:      [],
  })

  const mapLoading = ref(true)
  function setMapLoading(val) { mapLoading.value = val }

  const norm = s => s?.toLowerCase().normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').trim() ?? ''

  const filteredStats = computed(() => {
    const { puente, pap, search } = activeFilters.value
    const hasPuente = puente && puente !== 'Todos los puentes'
    const hasPap    = pap && pap !== 'Todos los PAP y otros'
    const q         = search ? norm(search) : ''

    if (!hasPuente && !hasPap && !q) return mapStats.value

    const vias = mapStats.value.viasDetalle.filter(v => {
      if (hasPuente && v.proyecto !== puente) return false
      if (hasPap    && v.proyecto !== pap) return false
      if (q && !norm(v.nombre).includes(q)
            && !norm(v.municipio).includes(q)
            && !norm(v.subregion).includes(q)) return false
      return true
    })

    const longitudTotal = vias.reduce((s, v) => s + (v.km || 0), 0)

    return {
      viasIntervenidas: new Set(vias.map(v => v.nombre).filter(Boolean)).size,
      longitudTotal:    Math.round(longitudTotal * 100) / 100,
      municipios:       new Set(vias.map(v => v.municipio).filter(Boolean)).size,
      proyectos:        new Set(vias.map(v => v.proyecto).filter(Boolean)).size,
      viasDetalle:      vias,
      subregiones:      mapStats.value.subregiones,
    }
  })

  function setFilter(filters) {
    // Exclusividad: si cambia puente y es válido, reiniciar pap. Y viceversa.
    if (filters.puente !== activeFilters.value.puente && filters.puente !== 'Todos los puentes') {
      filters.pap = 'Todos los PAP y otros'
    } else if (filters.pap !== activeFilters.value.pap && filters.pap !== 'Todos los PAP y otros') {
      filters.puente = 'Todos los puentes'
    }
    
    // Si se limpia pap mientras puente estaba limpio, o viceversa, asegurar que quede consistente.
    activeFilters.value = filters
  }

  function setFilterOptions(options) { filterOptions.value = options }
  function setMapStats(stats)        { mapStats.value = stats }

  return {
    activeFilters,
    filterOptions,
    mapStats,
    filteredStats,
    mapLoading,
    setFilter,
    setFilterOptions,
    setMapStats,
    setMapLoading,
  }
})
