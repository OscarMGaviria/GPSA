import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

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
  const { createMaplibreMock } = await import('../helpers/maplibreMock.js')
  return createMaplibreMock(actual)
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

  it('actualiza el contenido del popup al arrastrar el marcador', async () => {
    const { wrapper } = await mountAndLoad()
    wrapper.vm.toggleDevMarker()
    const marker = maplibregl.Marker.instances.at(-1)
    const dragHandler = marker.on.mock.calls.find(([event]) => event === 'drag')[1]
    expect(() => dragHandler()).not.toThrow()
    wrapper.unmount()
  })

  it('el botón "Copiar coordenadas" copia al portapapeles y actualiza el texto', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    const { wrapper } = await mountAndLoad()
    wrapper.vm.toggleDevMarker()
    const marker = maplibregl.Marker.instances.at(-1)
    const container = marker.setPopup.mock.calls[0][0].setDOMContent.mock.calls[0][0]
    const btn = container.querySelector('.dev-copy-coords-btn')
    const span = btn.querySelector('span')

    btn.dispatchEvent(new MouseEvent('mousedown'))
    expect(btn.style.transform).toBe('scale(0.96)')
    btn.dispatchEvent(new MouseEvent('mouseup'))
    expect(btn.style.transform).toBe('none')

    btn.dispatchEvent(new MouseEvent('mouseenter'))
    expect(btn.style.background).toBe('rgb(13, 111, 83)')
    btn.dispatchEvent(new MouseEvent('mouseleave'))
    expect(btn.style.background).toBe('rgb(11, 86, 64)')

    btn.dispatchEvent(new MouseEvent('click'))
    await new Promise(r => setTimeout(r, 0))
    expect(writeText).toHaveBeenCalled()
    expect(span.textContent).toBe('¡Copiado!')
    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('registra el error si falla la copia al portapapeles', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denegado'))
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { wrapper } = await mountAndLoad()
    wrapper.vm.toggleDevMarker()
    const marker = maplibregl.Marker.instances.at(-1)
    const container = marker.setPopup.mock.calls[0][0].setDOMContent.mock.calls[0][0]
    const btn = container.querySelector('.dev-copy-coords-btn')
    btn.dispatchEvent(new MouseEvent('click'))
    await new Promise(r => setTimeout(r, 0))
    expect(errSpy).toHaveBeenCalled()
    wrapper.unmount()
    vi.unstubAllGlobals()
  })
})
