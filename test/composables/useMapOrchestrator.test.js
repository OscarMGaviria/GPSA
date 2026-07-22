import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// Mocks vacíos de los controles de MapLibre: no se testea su comportamiento interno.
function NavigationControl() { /* mock vacío intencional */ }
function ScaleControl() { /* mock vacío intencional */ }
function GeolocateControl() { /* mock vacío intencional */ }

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

vi.mock('../../src/services/api.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getMunicipios: vi.fn(),
    getLocalizaciones: vi.fn(),
  }
})

vi.mock('maplibre-gl', async () => {
  const actual = await vi.importActual('maplibre-gl')

  class FakeMap {
    constructor(opts) {
      this.opts = opts
      this._layers = new Map()
      this._sources = new Map()
      this._handlers = {}
      this.touchZoomRotate = { disableRotation: vi.fn() }
      this.addControl = vi.fn()
      this.on = vi.fn((event, a, b) => {
        if (typeof a === 'function') this._handlers[event] = a
        else this._handlers[`${event}|${a}`] = b
      })
      this.once = vi.fn((event, cb) => { this._handlers[event] = cb })
      this.addSource = vi.fn((id, src) => this._sources.set(id, src))
      this.getSource = vi.fn((id) => this._sources.get(id) ?? null)
      this.getLayer = vi.fn((id) => this._layers.has(id))
      this.addLayer = vi.fn((layer) => this._layers.set(layer.id, layer))
      this.removeLayer = vi.fn((id) => this._layers.delete(id))
      this.setLayoutProperty = vi.fn()
      this.setPaintProperty = vi.fn()
      this.setFilter = vi.fn()
      this.setFeatureState = vi.fn()
      this.setTerrain = vi.fn()
      this.setSky = vi.fn()
      this.getStyle = vi.fn(() => ({ layers: [{ id: 'base-layer' }] }))
      this.getTerrain = vi.fn(() => null)
      this.easeTo = vi.fn()
      this.flyTo = vi.fn()
      this.fitBounds = vi.fn()
      this.resize = vi.fn()
      this.remove = vi.fn()
      this.getBearing = vi.fn(() => 0)
      this.getCenter = vi.fn(() => ({ lng: -75.5, lat: 7 }))
      this.getCanvas = vi.fn(() => ({ offsetWidth: 1000, offsetHeight: 800, style: { cursor: '' } }))
      this.project = vi.fn((coords) => ({ x: (coords[0] + 80) * 10, y: (10 - coords[1]) * 10 }))
      this.getBounds = vi.fn(() => ({ getWest: () => -85, getEast: () => -65, getSouth: () => -5, getNorth: () => 15 }))
      FakeMap.instances.push(this)
    }
    triggerLoad() { return this._handlers['load']?.() }
  }
  FakeMap.instances = []

  function FakeMarker(opts) {
    this.opts = opts
    this.setLngLat = vi.fn().mockReturnThis()
    this.setPopup = vi.fn().mockReturnThis()
    this.addTo = vi.fn().mockReturnThis()
    this.remove = vi.fn()
    this.togglePopup = vi.fn()
    this.getLngLat = vi.fn(() => ({ lat: 7.1, lng: -75.4 }))
    this.on = vi.fn()
    FakeMarker.instances.push(this)
  }
  FakeMarker.instances = []

  function FakePopup(opts) {
    this.opts = opts
    this.setDOMContent = vi.fn().mockReturnThis()
  }

  return {
    default: {
      Map: FakeMap,
      Marker: FakeMarker,
      Popup: FakePopup,
      LngLatBounds: actual.default.LngLatBounds,
      NavigationControl,
      ScaleControl,
      GeolocateControl,
    },
  }
})

import maplibregl from 'maplibre-gl'
import { getMunicipios, getLocalizaciones } from '../../src/services/api.js'
import { useMapOrchestrator } from '../../src/composables/useMapOrchestrator.js'
import { useMapStore } from '../../src/stores/useMapStore.js'

const MUNICIPIOS_FC = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { MPIO_NOMBR: 'FRONTINO', SUBREGION: 'OCCIDENTE' }, geometry: { type: 'Point', coordinates: [-76.1, 6.7] } },
  ],
}

const VIAS_FC = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        NOMBRE_VIA: 'El Botón - Frontino', CODIGO_VIA: 'V1', MPIO_NOMBR: 'FRONTINO', SUBREGION: 'OCCIDENTE',
        CIRCUITO: 'Frontino - Nutibara', Long_km: '10', AV_FISICO: '50', AV_FINAN: '40', ESTABILIZADO: '5',
        CONTRATIST: 'CONSORCIO A', CTO: 'C1', INTERV: 'INT1', PLAZO_MESE: '12', FECHA_INI: '2024-01-01',
      },
      geometry: { type: 'LineString', coordinates: [[-76.1, 6.7], [-76.2, 6.8]] },
    },
  ],
}

function makeComponent(filtersRef) {
  return defineComponent({
    setup() {
      const mapContainer = ref(null)
      const api = useMapOrchestrator(mapContainer, filtersRef)
      return { mapContainer, ...api }
    },
    template: '<div ref="mapContainer"></div>',
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  globalThis.ResizeObserver = vi.fn(function() { this.observe = vi.fn(); this.disconnect = vi.fn() })
  globalThis.innerWidth = 1280
  maplibregl.Map.instances = []
  maplibregl.Marker.instances = []
  vi.mocked(getMunicipios).mockReset().mockResolvedValue({ data: MUNICIPIOS_FC, fromCache: false })
  vi.mocked(getLocalizaciones).mockReset().mockResolvedValue({ data: VIAS_FC, fromCache: false })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function mountAndLoad(filtersRef = ref({ search: '', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })) {
  const wrapper = mount(makeComponent(filtersRef))
  const map = maplibregl.Map.instances.at(-1)
  await map.triggerLoad()
  await nextTick()
  await new Promise(r => setTimeout(r, 10))
  await nextTick()
  return { wrapper, map }
}

describe('useMapOrchestrator — wiring de creación y carga', () => {
  it('actualiza mapBearing cuando el mapa emite "rotate"', async () => {
    const { wrapper, map } = await mountAndLoad()
    map.getBearing.mockReturnValue(42)
    map._handlers['rotate']()
    expect(wrapper.vm.mapBearing).toBe(42)
    wrapper.unmount()
  })

  it('al disparar "load" ejecuta loadSimeva y termina con loading=false', async () => {
    const { wrapper } = await mountAndLoad()
    expect(wrapper.vm.loading).toBe(false)
    wrapper.unmount()
  })

  it('marca el store como cargando durante el ciclo de loadSimeva', async () => {
    const store = useMapStore()
    const wrapper = mount(makeComponent(ref({ search: '', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })))
    const map = maplibregl.Map.instances.at(-1)
    expect(store.mapLoading).toBe(true)
    await map.triggerLoad()
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    await nextTick()
    expect(store.mapLoading).toBe(false)
    wrapper.unmount()
  })
})

describe('useMapOrchestrator — resetBearing', () => {
  it('anima bearing y pitch a 0', async () => {
    const { wrapper, map } = await mountAndLoad()
    wrapper.vm.resetBearing()
    expect(map.easeTo).toHaveBeenCalledWith({ bearing: 0, pitch: 0, duration: 500 })
    wrapper.unmount()
  })
})

describe('useMapOrchestrator — openVia / flyToVia', () => {
  it('openVia no hace nada si el nombre de vía no existe en cachedVias', async () => {
    const { wrapper } = await mountAndLoad()
    wrapper.vm.openVia({ nombre: 'Vía Inexistente', subregion: '' })
    expect(wrapper.vm.selectedVia).toBeNull()
    wrapper.unmount()
  })

  it('openVia construye selectedVia con los datos agregados del circuito', async () => {
    const { wrapper, map } = await mountAndLoad()
    wrapper.vm.openVia({ nombre: 'El Botón - Frontino', subregion: 'OCCIDENTE' })
    expect(wrapper.vm.selectedVia.name).toBe('Frontino - Nutibara')
    expect(wrapper.vm.selectedVia.description.Contratista).toBe('CONSORCIO A')
    expect(wrapper.vm.selectedVia.description['Longitud (km)']).toBe(10)
    expect(wrapper.vm.selectedVia.description['Avance físico']).toBe('50%')
    expect(map.fitBounds).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('flyToVia mueve el mapa sin fijar selectedVia', async () => {
    const { wrapper, map } = await mountAndLoad()
    wrapper.vm.flyToVia({ nombre: 'El Botón - Frontino', subregion: 'OCCIDENTE' })
    expect(map.fitBounds).toHaveBeenCalled()
    expect(wrapper.vm.selectedVia).toBeNull()
    wrapper.unmount()
  })
})

describe('useMapOrchestrator — flyToCoords', () => {
  it('anima el mapa y agrega un marcador', async () => {
    const { wrapper, map } = await mountAndLoad()
    wrapper.vm.flyToCoords(6.5, -75.8)
    expect(map.flyTo).toHaveBeenCalledWith({ center: [-75.8, 6.5], zoom: 15, duration: 900, essential: true })
    expect(maplibregl.Marker.instances.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('remueve el marcador anterior al volver a llamar flyToCoords', async () => {
    const { wrapper } = await mountAndLoad()
    wrapper.vm.flyToCoords(6.5, -75.8)
    const firstMarker = maplibregl.Marker.instances.at(-1)
    wrapper.vm.flyToCoords(6.6, -75.9)
    expect(firstMarker.remove).toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('useMapOrchestrator — toggleDevMarker', () => {
  it('crea un marcador de desarrollo en la primera llamada', async () => {
    const { wrapper } = await mountAndLoad()
    const before = maplibregl.Marker.instances.length
    wrapper.vm.toggleDevMarker()
    expect(maplibregl.Marker.instances.length).toBe(before + 1)
    wrapper.unmount()
  })

  it('remueve el marcador de desarrollo en la segunda llamada', async () => {
    const { wrapper } = await mountAndLoad()
    wrapper.vm.toggleDevMarker()
    const marker = maplibregl.Marker.instances.at(-1)
    wrapper.vm.toggleDevMarker()
    expect(marker.remove).toHaveBeenCalled()
    wrapper.unmount()
  })
})
