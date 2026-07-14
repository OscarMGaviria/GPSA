import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../../src/stores/useMapStore.js'
import { useCallouts } from '../../src/composables/useCallouts.js'

function createMockMap() {
  return {
    getCanvas: () => ({ offsetWidth: 1000, offsetHeight: 800 }),
    project: vi.fn((coords) => ({ x: (coords[0] + 80) * 100, y: (10 - coords[1]) * 50 })),
    getBounds: () => ({
      getWest: () => -80, getEast: () => -70, getSouth: () => 0, getNorth: () => 10,
    }),
  }
}

const FEATURE_A = {
  properties: { name: 'Via A', description: '<table><tr><td>Subregion</td><td>occidente</td></tr></table>' },
  geometry: { type: 'LineString', coordinates: [[-76, 6], [-76.1, 6.1]] },
}
const FEATURE_B = {
  properties: { name: 'Via B', description: '' },
  geometry: { type: 'LineString', coordinates: [[-75, 5], [-75.1, 5.1]] },
}

describe('useCallouts — buildCallouts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('construye un callout por cada feature con nombre, km y subregión', () => {
    const { callouts, buildCallouts } = useCallouts(() => null)
    buildCallouts([FEATURE_A])
    expect(callouts.value.length).toBe(1)
    expect(callouts.value[0].name).toBe('Via A')
    expect(callouts.value[0].subregion).toBe('OCCIDENTE')
    expect(callouts.value[0].km).toBeGreaterThan(0)
  })

  it('usa "Vía" como nombre por defecto si la feature no trae name', () => {
    const { callouts, buildCallouts } = useCallouts(() => null)
    buildCallouts([{ properties: {}, geometry: FEATURE_B.geometry }])
    expect(callouts.value[0].name).toBe('Vía')
  })

  it('vacía visibleCallouts al reconstruir', () => {
    const { visibleCallouts, buildCallouts } = useCallouts(() => null)
    buildCallouts([FEATURE_A])
    expect(visibleCallouts.value).toEqual([])
  })
})

describe('useCallouts — refreshVisibleCallouts', () => {
  let map, store

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useMapStore()
    store.setMapStats({
      viasIntervenidas: 0, longitudTotal: 0, municipios: 0, circuitos: 0, subregiones: [],
      viasDetalle: [
        { nombre: 'Via A', municipio: 'FRONTINO', subregion: 'Occidente', circuito: 'C1', km: 5 },
        { nombre: 'Via B', municipio: 'GUARNE', subregion: 'Oriente', circuito: 'C2', km: 3 },
      ],
    })
    map = createMockMap()
  })

  it('vacía visibleCallouts cuando no hay ningún filtro activo', () => {
    const { buildCallouts, refreshVisibleCallouts, visibleCallouts } = useCallouts(() => map)
    buildCallouts([FEATURE_A, FEATURE_B])
    refreshVisibleCallouts({ search: '', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    expect(visibleCallouts.value).toEqual([])
  })

  it('muestra solo los callouts permitidos por el filtro y visibles en el viewport', () => {
    store.setFilter({ search: '', subregion: 'Occidente', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    const { buildCallouts, refreshVisibleCallouts, visibleCallouts } = useCallouts(() => map)
    buildCallouts([FEATURE_A, FEATURE_B])
    refreshVisibleCallouts({ search: '', subregion: 'Occidente', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    expect(visibleCallouts.value.length).toBe(1)
    expect(visibleCallouts.value[0].name).toBe('Via A')
  })

  it('no incluye callouts fuera del viewport', () => {
    store.setFilter({ search: '', subregion: 'Occidente', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    // Forzamos que el proyecto quede fuera del canvas (1000x800)
    map.project = vi.fn(() => ({ x: -500, y: -500 }))
    const { buildCallouts, refreshVisibleCallouts, visibleCallouts } = useCallouts(() => map)
    buildCallouts([FEATURE_A])
    refreshVisibleCallouts({ search: '', subregion: 'Occidente', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    expect(visibleCallouts.value).toEqual([])
  })

  it('no lanza error si getMap() retorna null', () => {
    const { buildCallouts, refreshVisibleCallouts } = useCallouts(() => null)
    buildCallouts([FEATURE_A])
    expect(() => refreshVisibleCallouts({ search: 'algo', subregion: '', municipio: '', circuito: '' })).not.toThrow()
  })
})

describe('useCallouts — updateCalloutPositions', () => {
  it('reproyecta los callouts visibles usando el mapa', () => {
    setActivePinia(createPinia())
    const store = useMapStore()
    store.setMapStats({
      viasIntervenidas: 0, longitudTotal: 0, municipios: 0, circuitos: 0, subregiones: [],
      viasDetalle: [{ nombre: 'Via A', municipio: 'FRONTINO', subregion: 'Occidente', circuito: 'C1', km: 5 }],
    })
    store.setFilter({ search: '', subregion: 'Occidente', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })

    const map = createMockMap()
    const { buildCallouts, refreshVisibleCallouts, updateCalloutPositions, visibleCallouts } = useCallouts(() => map)
    buildCallouts([FEATURE_A])
    refreshVisibleCallouts({ search: '', subregion: 'Occidente', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    expect(visibleCallouts.value.length).toBe(1)

    const callsBefore = map.project.mock.calls.length
    updateCalloutPositions()
    expect(map.project.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})
