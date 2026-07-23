import { vi } from 'vitest'

// Mocks vacíos de los controles de MapLibre: no se testea su comportamiento interno.
function NavigationControl() { /* mock vacío intencional */ }
function ScaleControl() { /* mock vacío intencional */ }
function GeolocateControl() { /* mock vacío intencional */ }

function FakePopup(opts) {
  this.opts = opts
  this.setDOMContent = vi.fn().mockReturnThis()
}

/**
 * Factory compartida del mock de `maplibre-gl` usada por los tests que montan
 * MapView/App/useMapOrchestrator. Reduce la duplicación entre archivos (antes
 * cada uno definía su propia copia idéntica de FakeMap/FakeMarker/FakePopup).
 */
export function createMaplibreMock(actual) {
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


  return {
    default: {
      Map: FakeMap, Marker: FakeMarker, Popup: FakePopup,
      LngLatBounds: actual.default.LngLatBounds,
      NavigationControl, ScaleControl, GeolocateControl,
    },
  }
}
