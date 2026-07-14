import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

vi.mock('../src/services/api.js', () => ({
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
  
  function NavigationControl() {}
  function ScaleControl() {}
  function GeolocateControl() {}

  return {
    default: {
      Map: FakeMap, Marker: FakeMarker, Popup: FakePopup,
      LngLatBounds: actual.default.LngLatBounds,
      NavigationControl, ScaleControl, GeolocateControl,
    },
  }
})

import maplibregl from 'maplibre-gl'
import { getMunicipios, getLocalizaciones } from '../src/services/api.js'
import App from '../src/App.vue'

function click(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

beforeEach(() => {
  setActivePinia(createPinia())
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({ observe: vi.fn(), disconnect: vi.fn() }))
  globalThis.innerWidth = 1280
  maplibregl.Map.instances = []
  localStorage.clear()
  vi.mocked(getMunicipios).mockReset().mockReturnValue(new Promise(() => {}))
  vi.mocked(getLocalizaciones).mockReset().mockReturnValue(new Promise(() => {}))
  globalThis.history.replaceState(null, '', '/')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App — pantallas iniciales', () => {
  it('muestra el loader de carga global mientras mapLoading es true', () => {
    const wrapper = mount(App, { attachTo: document.body })
    expect(wrapper.find('.app-loader').exists()).toBe(true)
    wrapper.unmount()
  })

  it('muestra AppWelcome si no se ha marcado como visto', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.welcome-card')).not.toBeNull()
    wrapper.unmount()
  })

  it('no muestra AppTour mientras AppWelcome está visible', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.tour-tooltip')).toBeNull()
    wrapper.unmount()
  })

  it('al cerrar AppWelcome, guarda la marca y muestra AppTour', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await nextTick()
    click(document.querySelector('.btn-start'))
    await nextTick()
    expect(localStorage.getItem('simeva-welcome-done')).toBe('1')
    expect(document.querySelector('.welcome-card')).toBeNull()
    expect(document.querySelector('.tour-tooltip')).not.toBeNull()
    wrapper.unmount()
  })

  it('no muestra AppWelcome ni AppTour si ya se marcaron como vistos', async () => {
    localStorage.setItem('simeva-welcome-done', '1')
    localStorage.setItem('simeva-tour-done', '1')
    const wrapper = mount(App, { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.welcome-card')).toBeNull()
    expect(document.querySelector('.tour-tooltip')).toBeNull()
    wrapper.unmount()
  })
})

describe('App — carga de datos', () => {
  it('oculta el loader global cuando termina de cargar el mapa', async () => {
    vi.mocked(getMunicipios).mockResolvedValue({ data: { type: 'FeatureCollection', features: [] }, fromCache: false })
    vi.mocked(getLocalizaciones).mockResolvedValue({ data: { type: 'FeatureCollection', features: [] }, fromCache: false })
    const wrapper = mount(App, { attachTo: document.body })
    const map = maplibregl.Map.instances.at(-1)
    await map.triggerLoad()
    await nextTick()
    await new Promise(r => setTimeout(r, 20))
    await nextTick()
    expect(wrapper.find('.app-loader').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('App — panel de estadísticas', () => {
  it('alterna el panel de estadísticas desde el header', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await nextTick()
    localStorage.setItem('simeva-welcome-done', '1')
    expect(document.querySelector('.stats-side').className).toContain('open')
    await wrapper.find('.btn-panel[aria-label="Colapsar panel"]').trigger('click')
    expect(document.querySelector('.stats-side').className).not.toContain(' open')
    wrapper.unmount()
  })
})

describe('App — sincronización de filtros con la URL', () => {
  it('actualiza el query string al aplicar un filtro de búsqueda', async () => {
    const wrapper = mount(App, { attachTo: document.body })
    await nextTick()
    const searchInput = document.querySelector('.desktop-only .search-input')
    searchInput.value = 'Frontino'
    searchInput.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(globalThis.location.search).toContain('search=Frontino')
    wrapper.unmount()
  })
})
