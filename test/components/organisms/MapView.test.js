import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// Mocks vacíos de los controles de MapLibre: no se testea su comportamiento interno.
function NavigationControl() { /* mock vacío intencional */ }
function ScaleControl() { /* mock vacío intencional */ }
function GeolocateControl() { /* mock vacío intencional */ }

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

vi.mock('../../../src/services/api.js', () => ({
  getMunicipios: vi.fn(),
  getLocalizaciones: vi.fn(),
}))

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
  }

  function FakePopup(opts) {
    this.opts = opts
    this.setDOMContent = vi.fn().mockReturnThis()
  }

  return {
    default: {
      Map: FakeMap, Marker: FakeMarker, Popup: FakePopup,
      LngLatBounds: actual.default.LngLatBounds,
      NavigationControl, ScaleControl, GeolocateControl,
    },
  }
})

import maplibregl from 'maplibre-gl'
import { getMunicipios, getLocalizaciones } from '../../../src/services/api.js'
import MapView from '../../../src/components/organisms/MapView.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  globalThis.ResizeObserver = vi.fn(function() { this.observe = vi.fn(); this.disconnect = vi.fn() })
  globalThis.innerWidth = 1280
  maplibregl.Map.instances = []
  vi.mocked(getMunicipios).mockReset()
  vi.mocked(getLocalizaciones).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function mountMapView() {
  return mount(MapView, { attachTo: document.body })
}

describe('MapView — renderizado inicial', () => {
  it('monta sin errores y crea el mapa', () => {
    vi.mocked(getMunicipios).mockReturnValue(new Promise(() => {}))
    vi.mocked(getLocalizaciones).mockReturnValue(new Promise(() => {}))
    const wrapper = mountMapView()
    expect(wrapper.find('.map-container').exists()).toBe(true)
    expect(maplibregl.Map.instances.length).toBe(1)
    wrapper.unmount()
  })

  it('muestra el overlay de error si ambas peticiones fallan', async () => {
    vi.mocked(getMunicipios).mockRejectedValue(new Error('fail'))
    vi.mocked(getLocalizaciones).mockRejectedValue(new Error('fail'))
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    await map.triggerLoad()
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    await nextTick()
    expect(wrapper.find('.map-error').exists()).toBe(true)
    wrapper.unmount()
  })

  it('el botón "Reintentar" vuelve a llamar a loadSimeva', async () => {
    vi.mocked(getMunicipios).mockRejectedValue(new Error('fail'))
    vi.mocked(getLocalizaciones).mockRejectedValue(new Error('fail'))
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    await map.triggerLoad()
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    await nextTick()
    vi.mocked(getMunicipios).mockResolvedValue({ data: { type: 'FeatureCollection', features: [] }, fromCache: false })
    vi.mocked(getLocalizaciones).mockResolvedValue({ data: { type: 'FeatureCollection', features: [] }, fromCache: false })
    await wrapper.find('.error-retry').trigger('click')
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    await nextTick()
    expect(wrapper.find('.map-error').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('MapView — controles del mapa', () => {
  beforeEach(() => {
    vi.mocked(getMunicipios).mockReturnValue(new Promise(() => {}))
    vi.mocked(getLocalizaciones).mockReturnValue(new Promise(() => {}))
  })

  it('abre y cierra el panel de mapas base', async () => {
    const wrapper = mountMapView()
    expect(wrapper.find('.switcher-panel').exists()).toBe(false)
    await wrapper.find('.switcher-toggle').trigger('click')
    expect(wrapper.find('.switcher-panel').exists()).toBe(true)
    await wrapper.find('.switcher-toggle').trigger('click')
    expect(wrapper.find('.switcher-panel').exists()).toBe(false)
    wrapper.unmount()
  })

  it('activa el relieve 3D al hacer clic en terrain-toggle', async () => {
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    await wrapper.find('.terrain-toggle').trigger('click')
    expect(map.setTerrain).toHaveBeenCalled()
    expect(wrapper.find('.terrain-toggle').classes()).toContain('is-active')
    wrapper.unmount()
  })

  it('resetBearing se dispara con el botón de brújula', async () => {
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    await wrapper.find('.compass-toggle').trigger('click')
    expect(map.easeTo).toHaveBeenCalledWith({ bearing: 0, pitch: 0, duration: 500 })
    wrapper.unmount()
  })
})

describe('MapView — búsqueda de coordenadas (Ctrl+B)', () => {
  beforeEach(() => {
    vi.mocked(getMunicipios).mockReturnValue(new Promise(() => {}))
    vi.mocked(getLocalizaciones).mockReturnValue(new Promise(() => {}))
  })

  it('abre la barra de búsqueda con Ctrl+B y la cierra con Escape', async () => {
    const wrapper = mountMapView()
    expect(wrapper.find('.cs-wrap').exists()).toBe(false)
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    await nextTick()
    expect(wrapper.find('.cs-wrap').exists()).toBe(true)
    await wrapper.find('.cs-input').trigger('keydown', { key: 'Escape' })
    await nextTick()
    expect(wrapper.find('.cs-wrap').exists()).toBe(false)
    wrapper.unmount()
  })

  it('busca coordenadas decimales válidas y llama a map.flyTo', async () => {
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    await nextTick()
    await wrapper.find('.cs-input').setValue('6.2442, -75.5812')
    await wrapper.find('.cs-go').trigger('click')
    expect(map.flyTo).toHaveBeenCalledWith({ center: [-75.5812, 6.2442], zoom: 15, duration: 900, essential: true })
    expect(wrapper.find('.cs-wrap').exists()).toBe(false)
    wrapper.unmount()
  })

  it('muestra un error si el formato de coordenadas no es reconocido', async () => {
    const wrapper = mountMapView()
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    await nextTick()
    await wrapper.find('.cs-input').setValue('esto no son coordenadas')
    await wrapper.find('.cs-go').trigger('click')
    await nextTick()
    expect(wrapper.find('.cs-error').text()).toContain('Formato no reconocido')
    wrapper.unmount()
  })
})

describe('MapView — expose openVia / flyToVia', () => {
  it('expone openVia y flyToVia para uso externo (ej. StatsPanel)', () => {
    vi.mocked(getMunicipios).mockReturnValue(new Promise(() => {}))
    vi.mocked(getLocalizaciones).mockReturnValue(new Promise(() => {}))
    const wrapper = mountMapView()
    expect(typeof wrapper.vm.openVia).toBe('function')
    expect(typeof wrapper.vm.flyToVia).toBe('function')
    wrapper.unmount()
  })
})
