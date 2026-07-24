import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useMapStore = defineStore('map', () => {
  const activeFilters = ref({
    search:    '',
    subregion: 'Todas las subregiones',
    municipio: 'Todos los municipios',
    proyecto:  'Todos los proyectos',
  })

  const filterOptions = ref({
    subregiones:            ['Todas las subregiones'],
    municipios:             ['Todos los municipios'],
    proyectos:              ['Todos los proyectos'],
    municipiosPorSubregion: {},
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

  const filteredMunicipioOptions = computed(() => {
    const sub = activeFilters.value.subregion
    if (!sub || sub === 'Todas las subregiones') return filterOptions.value.municipios
    const lista = filterOptions.value.municipiosPorSubregion[sub] ?? []
    return ['Todos los municipios', ...lista]
  })

  const filteredProyectoOptions = computed(() => {
    const sub = activeFilters.value.subregion
    const mpio = activeFilters.value.municipio
    const hasSub = sub && sub !== 'Todas las subregiones'
    const hasMpio = mpio && mpio !== 'Todos los municipios'

    if (!hasSub && !hasMpio) return filterOptions.value.proyectos

    const normSub = norm(sub)
    const normMpio = norm(mpio)

    const vias = mapStats.value.viasDetalle.filter(v => {
      if (hasSub && norm(v.subregion) !== normSub) return false
      if (hasMpio && norm(v.municipio) !== normMpio) return false
      return true
    })

    const lista = [...new Set(vias.map(v => v.proyecto).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
    return ['Todos los proyectos', ...lista]
  })

  // Normaliza texto para comparar sin acentos ni mayúsculas
  const norm = s => s?.toLowerCase().normalize('NFD').replaceAll(/[̀-ͯ]/g, '').trim() ?? ''

  const filteredStats = computed(() => {
    const { subregion, municipio, proyecto, search } = activeFilters.value
    const hasSub  = subregion && subregion !== 'Todas las subregiones'
    const hasMpio = municipio && municipio !== 'Todos los municipios'
    const hasLoc  = proyecto  && proyecto  !== 'Todos los proyectos'
    const q       = search ? norm(search) : ''

    if (!hasSub && !hasMpio && !hasLoc && !q) return mapStats.value

    const normSub  = norm(subregion)
    const normMpio = norm(municipio)

    const vias = mapStats.value.viasDetalle.filter(v => {
      if (hasSub  && norm(v.subregion) !== normSub)  return false
      if (hasMpio && norm(v.municipio) !== normMpio)  return false
      if (hasLoc  && v.proyecto !== proyecto) return false
      if (q && !norm(v.nombre).includes(q)
            && !norm(v.municipio).includes(q)
            && !norm(v.subregion).includes(q)) return false
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
      proyectos:        new Set(vias.map(v => v.proyecto).filter(Boolean)).size,
      viasDetalle:      vias,
      subregiones:      mapStats.value.subregiones,
    }
  })

  function setFilter(filters) {
    if (filters.subregion !== activeFilters.value.subregion) {
      filters.municipio = 'Todos los municipios'
      filters.proyecto = 'Todos los proyectos'
    } else if (filters.municipio !== activeFilters.value.municipio) {
      filters.proyecto = 'Todos los proyectos'
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
    filteredProyectoOptions,
    setFilter,
    setFilterOptions,
    setMapStats,
    setMapLoading,
  }
})
