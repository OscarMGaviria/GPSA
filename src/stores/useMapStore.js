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

  const filteredStats = computed(() => {
    const { subregion, municipio, circuito, search } = activeFilters.value
    const hasSub  = subregion && subregion !== 'Todas las subregiones'
    const hasMpio = municipio && municipio !== 'Todos los municipios'
    const hasCir  = circuito  && circuito  !== 'Todos los circuitos'
    const q       = search?.trim().toLowerCase()

    if (!hasSub && !hasMpio && !hasCir && !q) return mapStats.value

    const vias = mapStats.value.viasDetalle.filter(v => {
      if (hasSub  && v.subregion?.toLowerCase() !== subregion.toLowerCase()) return false
      if (hasMpio && v.municipio?.toLowerCase() !== municipio.toLowerCase()) return false
      if (hasCir  && v.nombre !== circuito) return false
      if (q && !v.nombre?.toLowerCase().includes(q)
            && !v.municipio?.toLowerCase().includes(q)
            && !v.subregion?.toLowerCase().includes(q)) return false
      return true
    })

    const longitudTotal = vias.reduce((s, v) => s + (v.km || 0), 0)
    const totalKm       = longitudTotal || 1
    const kmPorSub      = {}
    for (const v of vias) {
      if (v.subregion) kmPorSub[v.subregion] = (kmPorSub[v.subregion] ?? 0) + (v.km || 0)
    }

    return {
      viasIntervenidas: new Set(vias.map(v => v.nombre).filter(Boolean)).size,
      longitudTotal:    Math.round(longitudTotal * 100) / 100,
      municipios:       new Set(vias.map(v => v.municipio).filter(Boolean)).size,
      circuitos:        new Set(vias.map(v => v.nombre).filter(Boolean)).size,
      viasDetalle:      vias,
      subregiones:      mapStats.value.subregiones
        .map(s => {
          const km = Math.round((kmPorSub[s.name] ?? 0) * 100) / 100
          return { name: s.name, km, pct: Math.round((km / totalKm) * 100) }
        })
        .filter(s => s.km > 0),
    }
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
    filteredStats,
    mapLoading,
    filteredMunicipioOptions,
    setFilter,
    setFilterOptions,
    setMapStats,
    setMapLoading,
  }
})
