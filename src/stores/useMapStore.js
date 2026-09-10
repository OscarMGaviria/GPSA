import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useMapStore = defineStore('map', () => {
  const activeFilters = ref({
    search: '',
    fuente: 'Todas las fuentes',
    puente: 'Todos los puentes',
    pap:    'Todos los PAP y otros',
  })

  const filterOptions = ref({
    fuentes: ['Todas las fuentes'],
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
  
  const layerToggles = ref([
    { id: 'gavino-localizacion', name: 'Puente Gavino - Localización', layers: ['gavino-localizacion-fill', 'gavino-localizacion-outline'], visible: false },
    { id: 'gavino-afectados', name: 'Puente Gavino - Afectados', layers: ['gavino-afectados-fill', 'gavino-afectados-outline', 'gavino-afectados-label'], visible: false },
    { id: 'micasita-afectados', name: 'Mi Casita - Afectados', layers: ['micasita-afectados-fill', 'micasita-afectados-outline'], visible: false },
    { id: 'heliconia-afectados', name: 'Heliconia - Afectados', layers: ['heliconia-afectados-fill', 'heliconia-afectados-outline'], visible: false },
    { id: 'gavino-cauce', name: 'Ocupación Cauce', layers: ['gavino-cauce-circle'], visible: false },
    { id: 'gavino-forestal', name: 'Aprovechamiento Forestal (Gavino)', layers: ['gavino-forestal-symbol'], visible: false },
    { id: 'gavino-abscisas', name: 'Abscisas', layers: ['gavino-abscisas-symbol'], visible: false },
    { id: 'area-intervenidas', name: 'Áreas Intervenidas', layers: ['area-intervenidas-fill', 'area-intervenidas-outline'], visible: true },
    { id: 'predios-intervenidos', name: 'Predios Intervenidos', layers: ['predios-intervenidos-fill', 'predios-intervenidos-outline'], visible: true },
    { id: 'arcgis-forestal', name: 'Inventario Forestal', layers: ['arcgis-forestal-symbol'], visible: true },
  ])
  
  function toggleLayer(id) {
    const layer = layerToggles.value.find(l => l.id === id)
    if (layer) layer.visible = !layer.visible
  }

  const norm = s => s?.toLowerCase().normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').trim() ?? ''

  const filteredStats = computed(() => {
    const { fuente, puente, pap, search } = activeFilters.value
    const hasFuente = fuente && fuente !== 'Todas las fuentes'
    const hasPuente = puente && puente !== 'Todos los puentes'
    const hasPap    = pap && pap !== 'Todos los PAP y otros'
    const q         = search ? norm(search) : ''

    if (!hasFuente && !hasPuente && !hasPap && !q) return mapStats.value

    const vias = mapStats.value.viasDetalle.filter(v => {
      if (hasFuente && v.fuente !== fuente) return false
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
    layerToggles,
    toggleLayer,
    setFilter,
    setFilterOptions,
    setMapStats,
    setMapLoading,
  }
})
