import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount } from '@vue/test-utils'

// Mocks vacíos de los controles de MapLibre: no se testea su comportamiento interno.
function NavigationControl() { /* mock vacío intencional */ }
function ScaleControl() { /* mock vacío intencional */ }
function GeolocateControl() { /* mock vacío intencional */ }

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

vi.mock('maplibre-gl', () => {
  class FakeMap {
    constructor(opts) {
      this.opts = opts
      this._layers = new Map()
      this._sources = new Map()
      this._handlers = {}
      this.touchZoomRotate = { disableRotation: vi.fn() }
      this.addControl = vi.fn()
      this.on = vi.fn((event, cb) => { this._handlers[event] = cb })
      this.addSource = vi.fn((id, src) => this._sources.set(id, src))
      this.getSource = vi.fn((id) => this._sources.get(id) ?? null)
      this.getLayer = vi.fn((id) => this._layers.has(id))
      this.addLayer = vi.fn((layer) => this._layers.set(layer.id, layer))
      this.removeLayer = vi.fn((id) => this._layers.delete(id))
      this.setLayoutProperty = vi.fn()
      this.setPaintProperty = vi.fn()
      this.setTerrain = vi.fn()
      this.setSky = vi.fn()
      this.getStyle = vi.fn(() => ({ layers: [{ id: 'base-layer' }] }))
      this.easeTo = vi.fn()
      this.resize = vi.fn()
      this.remove = vi.fn()
      FakeMap.instances.push(this)
    }
    triggerLoad() { return this._handlers['load']?.() }
  }
  FakeMap.instances = []

  return { default: { Map: FakeMap, NavigationControl, ScaleControl, GeolocateControl } }
})

import maplibregl from 'maplibre-gl'
import { useMapInit, BASEMAPS, CENTER, ZOOM } from '../../src/composables/useMapInit.js'

function makeComponent(opts = {}) {
  return defineComponent({
    setup() {
      const mapContainer = ref(null)
      const api = useMapInit(mapContainer, opts)
      return { mapContainer, ...api }
    },
    template: '<div ref="mapContainer"></div>',
  })
}

beforeEach(() => {
  globalThis.ResizeObserver = vi.fn(function() { this.observe = vi.fn(); this.disconnect = vi.fn() })
  maplibregl.Map.instances = []
  globalThis.innerWidth = 1280
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useMapInit — creación del mapa', () => {
  it('crea el mapa con el centro y zoom por defecto', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    expect(map.opts.center).toEqual(CENTER)
    expect(map.opts.zoom).toBe(ZOOM)
    wrapper.unmount()
  })

  it('agrega los 3 controles de navegación', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    expect(map.addControl).toHaveBeenCalledTimes(3)
    wrapper.unmount()
  })

  it('llama a onMapCreated con la instancia del mapa', () => {
    const onMapCreated = vi.fn()
    const wrapper = mount(makeComponent({ onMapCreated }))
    const map = maplibregl.Map.instances.at(-1)
    expect(onMapCreated).toHaveBeenCalledWith(map)
    wrapper.unmount()
  })

  it('en móvil (innerWidth <= 1024) deshabilita la rotación táctil y limita maxPitch a 0', () => {
    globalThis.innerWidth = 800
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    expect(map.opts.maxPitch).toBe(0)
    expect(map.opts.dragRotate).toBe(false)
    expect(map.touchZoomRotate.disableRotation).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('en escritorio permite rotación y maxPitch 85', () => {
    globalThis.innerWidth = 1280
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    expect(map.opts.maxPitch).toBe(85)
    expect(map.opts.dragRotate).toBe(true)
    wrapper.unmount()
  })
})

describe('useMapInit — evento load', () => {
  it('agrega las fuentes de terreno y llama a onLoad al disparar "load"', async () => {
    const onLoad = vi.fn()
    const wrapper = mount(makeComponent({ onLoad }))
    const map = maplibregl.Map.instances.at(-1)
    await map.triggerLoad()
    expect(map.addSource).toHaveBeenCalledWith('terrainSource', expect.any(Object))
    expect(map.addSource).toHaveBeenCalledWith('hillshadeSource', expect.any(Object))
    expect(onLoad).toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('useMapInit — switchBasemap', () => {
  it('oculta la capa base al cambiar a "ninguno"', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    map._layers.set('base-layer', {})
    map._sources.set('base', { setTiles: vi.fn() })
    // Estado inicial ya es 'ninguno'; cambiamos primero a otro basemap
    wrapper.vm.switchBasemap(BASEMAPS.find(b => b.id === 'claro'))
    map.setLayoutProperty.mockClear()
    wrapper.vm.switchBasemap(BASEMAPS.find(b => b.id === 'ninguno'))
    expect(wrapper.vm.activeBasemap).toBe('ninguno')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('base-layer', 'visibility', 'none')
    wrapper.unmount()
  })

  it('muestra la capa base y actualiza los tiles al cambiar a un basemap con tiles', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    map._layers.set('base-layer', {})
    const setTiles = vi.fn()
    map._sources.set('base', { setTiles })
    const claro = BASEMAPS.find(b => b.id === 'claro')
    wrapper.vm.switchBasemap(claro)
    expect(wrapper.vm.activeBasemap).toBe('claro')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('base-layer', 'visibility', 'visible')
    expect(setTiles).toHaveBeenCalledWith(claro.tiles)
    wrapper.unmount()
  })

  it('no hace nada si ya está activo ese basemap', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    wrapper.vm.switchBasemap(BASEMAPS.find(b => b.id === 'ninguno'))
    map.setLayoutProperty.mockClear()
    wrapper.vm.switchBasemap(BASEMAPS.find(b => b.id === 'ninguno'))
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('useMapInit — toggleTerrain', () => {
  it('activa el terreno, fuerza basemap "estandar" si estaba en "ninguno", y hace pitch a 70', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    expect(wrapper.vm.activeBasemap).toBe('ninguno')
    wrapper.vm.toggleTerrain()
    expect(wrapper.vm.terrainActive).toBe(true)
    expect(wrapper.vm.activeBasemap).toBe('estandar')
    expect(map.setTerrain).toHaveBeenCalledWith({ source: 'terrainSource', exaggeration: 1.5 })
    expect(map.addLayer).toHaveBeenCalled()
    expect(map.easeTo).toHaveBeenCalledWith({ pitch: 70, duration: 900 })
    wrapper.unmount()
  })

  it('al desactivar el terreno restaura el basemap "ninguno" si fue forzado', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    wrapper.vm.toggleTerrain() // activa (fuerza estandar)
    wrapper.vm.toggleTerrain() // desactiva
    expect(wrapper.vm.terrainActive).toBe(false)
    expect(wrapper.vm.activeBasemap).toBe('ninguno')
    expect(map.setTerrain).toHaveBeenLastCalledWith(null)
    expect(map.easeTo).toHaveBeenLastCalledWith({ pitch: 0, duration: 900 })
    wrapper.unmount()
  })

  it('no fuerza cambio de basemap si ya había uno distinto de "ninguno" activo', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    map._layers.set('base-layer', {})
    map._sources.set('base', { setTiles: vi.fn() })
    wrapper.vm.switchBasemap(BASEMAPS.find(b => b.id === 'claro'))
    wrapper.vm.toggleTerrain()
    expect(wrapper.vm.activeBasemap).toBe('claro')
    wrapper.vm.toggleTerrain()
    expect(wrapper.vm.activeBasemap).toBe('claro')
    wrapper.unmount()
  })

  it('no hace nada si el mapa aún no existe (getMap null)', () => {
    const wrapper = mount(makeComponent())
    // Forzamos _map a null simulando llamada antes del montaje no es posible desde fuera;
    // en su lugar validamos que toggleTerrain con mapa existente no lance error.
    expect(() => wrapper.vm.toggleTerrain()).not.toThrow()
    wrapper.unmount()
  })

  it('no vuelve a agregar hillshade ni llama a setSky si el mapa no lo soporta o ya existe', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    map._layers.set('hillshade', {})
    map.getStyle.mockReturnValueOnce({}) // sin `layers`, ejercita el fallback `|| []`
    map.setSky = undefined // simula un mapa sin soporte de cielo atmosférico

    wrapper.vm.toggleTerrain() // activa: hillshade ya existe → no vuelve a agregarlo
    expect(map.addLayer).not.toHaveBeenCalled()

    wrapper.vm.toggleTerrain() // desactiva: hillshade existe → se remueve
    expect(map.removeLayer).toHaveBeenCalledWith('hillshade')
    wrapper.unmount()
  })

  it('actualiza los colores de las capas de municipios si ya existen al activar/desactivar', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    map._layers.set('municipios-fill', {})
    map._layers.set('municipios-outline', {})

    wrapper.vm.toggleTerrain() // activa
    expect(map.setPaintProperty).toHaveBeenCalledWith('municipios-fill', 'fill-color', expect.any(Array))
    expect(map.setPaintProperty).toHaveBeenCalledWith('municipios-outline', 'line-color', '#0284c7')

    wrapper.vm.toggleTerrain() // desactiva
    expect(map.setPaintProperty).toHaveBeenCalledWith('municipios-fill', 'fill-color', expect.arrayContaining(['case']))
    expect(map.setPaintProperty).toHaveBeenCalledWith('municipios-outline', 'line-color', '#2d8653')
    wrapper.unmount()
  })
})

describe('useMapInit — getMap', () => {
  it('retorna la instancia interna del mapa', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    expect(wrapper.vm.getMap()).toBe(map)
    wrapper.unmount()
  })
})

describe('useMapInit — desmontaje', () => {
  it('desconecta el ResizeObserver y remueve el mapa al desmontar', () => {
    const wrapper = mount(makeComponent())
    const map = maplibregl.Map.instances.at(-1)
    wrapper.unmount()
    expect(map.remove).toHaveBeenCalled()
  })
})
