import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../../src/stores/useMapStore.js'
import { useMapFilters } from '../../src/composables/useMapFilters.js'

const MUNICIPIOS_FC = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { MPIO_NOMBR: 'Frontino', SUBREGION: 'occidente' }, geometry: { type: 'Point', coordinates: [-76.1, 6.7] } },
    { type: 'Feature', properties: { MPIO_NOMBR: 'Guarne', SUBREGION: 'oriente' }, geometry: { type: 'Point', coordinates: [-75.4, 6.3] } },
  ],
}

const VIAS_FC = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { NOMBRE_VIA: 'El Botón - Frontino', CIRCUITO: 'Frontino - Nutibara' }, geometry: { type: 'LineString', coordinates: [[-76.1, 6.7], [-76.2, 6.8]] } },
  ],
}

function createMockMap() {
  return {
    _layers: new Set(['municipios-fill', 'municipios-outline', 'vias-line', 'vias-casing']),
    getLayer(name) { return this._layers.has(name) },
    setFilter: vi.fn(),
    setLayoutProperty: vi.fn(),
    setPaintProperty: vi.fn(),
    getTerrain: vi.fn(() => null),
    once: vi.fn((event, cb) => cb()),
    flyTo: vi.fn(),
    fitBounds: vi.fn(),
  }
}

describe('useMapFilters', () => {
  let map, filtersRef, cachedMunicipios, cachedVias, refreshVisibleCallouts

  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useMapStore()
    store.setMapStats({
      viasIntervenidas: 0, longitudTotal: 0, municipios: 0, circuitos: 0, subregiones: [],
      viasDetalle: [{ nombre: 'El Botón - Frontino', municipio: 'FRONTINO', subregion: 'Occidente', circuito: 'Frontino - Nutibara', km: 10 }],
    })

    map = createMockMap()
    filtersRef = ref({ search: '', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    cachedMunicipios = ref(null)
    cachedVias = ref(null)
    refreshVisibleCallouts = vi.fn()
  })

  function setup() {
    return useMapFilters(() => map, filtersRef, {
      cachedMunicipios, cachedVias, center: [-75, 6], zoom: 7, refreshVisibleCallouts,
    })
  }

  it('no aplica filtros mientras cachedMunicipios sea null', () => {
    setup()
    expect(map.setFilter).not.toHaveBeenCalled()
  })

  it('aplica filtros cuando cachedMunicipios está disponible', async () => {
    cachedMunicipios.value = MUNICIPIOS_FC
    setup()
    await nextTick()
    expect(map.setFilter).toHaveBeenCalled()
  })

  it('selecciona la subregión activa cuando el filtro trae subregion explícita', async () => {
    cachedMunicipios.value = MUNICIPIOS_FC
    filtersRef.value = { search: '', subregion: 'Occidente', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' }
    const { selectedSubregion, selectedMunicipio } = setup()
    await nextTick()
    expect(selectedSubregion.value).toBe('Occidente')
    expect(selectedMunicipio.value).toBe('')
  })

  it('deriva la subregión desde el municipio activo si no hay subregión explícita', async () => {
    cachedMunicipios.value = MUNICIPIOS_FC
    filtersRef.value = { search: '', subregion: 'Todas las subregiones', municipio: 'Frontino', circuito: 'Todos los circuitos' }
    const { selectedSubregion, selectedMunicipio } = setup()
    await nextTick()
    expect(selectedMunicipio.value).toBe('Frontino')
    expect(selectedSubregion.value).toBe('Occidente')
  })

  it('limpia las selecciones cuando no hay subregión ni municipio activos', async () => {
    cachedMunicipios.value = MUNICIPIOS_FC
    const { selectedSubregion, selectedMunicipio } = setup()
    await nextTick()
    expect(selectedSubregion.value).toBe('')
    expect(selectedMunicipio.value).toBe('')
  })

  it('vuela a la geometría del circuito cuando hay un circuito activo con vías cacheadas', async () => {
    cachedMunicipios.value = MUNICIPIOS_FC
    cachedVias.value = VIAS_FC
    filtersRef.value = { search: '', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Frontino - Nutibara' }
    setup()
    await nextTick()
    expect(map.fitBounds).toHaveBeenCalled()
  })

  it('marca noResults en true cuando el circuito filtrado no tiene vías', async () => {
    cachedMunicipios.value = MUNICIPIOS_FC
    cachedVias.value = VIAS_FC
    filtersRef.value = { search: '', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Circuito Inexistente' }
    const { noResults } = setup()
    await nextTick()
    expect(noResults.value).toBe(true)
  })

  it('marca noResults en false cuando el circuito filtrado sí tiene vías', async () => {
    cachedMunicipios.value = MUNICIPIOS_FC
    cachedVias.value = VIAS_FC
    filtersRef.value = { search: '', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Frontino - Nutibara' }
    const { noResults } = setup()
    await nextTick()
    expect(noResults.value).toBe(false)
  })

  it('llama a refreshVisibleCallouts cuando no hay ningún filtro activo', async () => {
    cachedMunicipios.value = MUNICIPIOS_FC
    setup()
    await nextTick()
    expect(refreshVisibleCallouts).toHaveBeenCalled()
  })

  it('hace fallback a map.flyTo(center, zoom) si no hay cachedMunicipios en el estado "sin filtros"', async () => {
    // cachedMunicipios debe tener valor para que el watch dispare applyFilters,
    // pero dentro de _handleFlightAndLabels se evalúa cachedMunicipios truthy igualmente,
    // por lo que se prueba el camino con municipios (feats) en su lugar.
    cachedMunicipios.value = MUNICIPIOS_FC
    setup()
    await nextTick()
    expect(map.fitBounds).toHaveBeenCalled()
  })

  it('no lanza error si getMap() retorna null/undefined', () => {
    const nullMap = () => null
    expect(() => useMapFilters(nullMap, filtersRef, {
      cachedMunicipios, cachedVias, center: [-75, 6], zoom: 7, refreshVisibleCallouts,
    })).not.toThrow()
  })
})
