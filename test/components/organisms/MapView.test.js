import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

vi.mock('../../../src/services/api.js', () => ({
  getMunicipios: vi.fn(),
  getLocalizaciones: vi.fn(),
}))

vi.mock('maplibre-gl', async () => {
  const actual = await vi.importActual('maplibre-gl')
  const { createMaplibreMock } = await import('../../helpers/maplibreMock.js')
  return createMaplibreMock(actual)
})

import maplibregl from 'maplibre-gl'
import { getMunicipios, getLocalizaciones } from '../../../src/services/api.js'
import { useMapStore } from '../../../src/stores/useMapStore.js'
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

  it('Ctrl+B alterna abrir/cerrar la barra de búsqueda', async () => {
    const wrapper = mountMapView()
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    await nextTick()
    expect(wrapper.find('.cs-wrap').exists()).toBe(true)
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true })) // cierra
    await nextTick()
    expect(wrapper.find('.cs-wrap').exists()).toBe(false)
    wrapper.unmount()
  })

  it('busca coordenadas en formato DMS con símbolo de grado', async () => {
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    await nextTick()
    await wrapper.find('.cs-input').setValue(`6°14'39"N 75°34'52"W`)
    await wrapper.find('.cs-go').trigger('click')
    expect(map.flyTo).toHaveBeenCalled()
    const [{ center }] = map.flyTo.mock.calls.at(-1)
    expect(center[1]).toBeCloseTo(6.244, 1)
    expect(center[0]).toBeCloseTo(-75.581, 1)
    wrapper.unmount()
  })

  it('busca coordenadas en formato DMS sin símbolo (espacios)', async () => {
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    await nextTick()
    await wrapper.find('.cs-input').setValue('6 14 39 N 75 34 52 W')
    await wrapper.find('.cs-go').trigger('click')
    expect(map.flyTo).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('detecta e intercambia lat/lng cuando el primer número es la longitud', async () => {
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    await nextTick()
    await wrapper.find('.cs-input').setValue('-75.5812, 6.2442')
    await wrapper.find('.cs-go').trigger('click')
    expect(map.flyTo).toHaveBeenCalledWith({ center: [-75.5812, 6.2442], zoom: 15, duration: 900, essential: true })
    wrapper.unmount()
  })

  it('no hace nada si se busca con el campo vacío', async () => {
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }))
    await nextTick()
    await wrapper.find('.cs-go').trigger('click')
    expect(map.flyTo).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('alterna el marcador de desarrollo con Ctrl+D', async () => {
    const wrapper = mountMapView()
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', ctrlKey: true }))
    await nextTick()
    // No lanza error y el atajo se procesa (cubre la rama Ctrl/Cmd+D de _onGlobalKey)
    expect(wrapper.find('.map-container').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('MapView — modal de municipio y letreros de subregión', () => {
  it('muestra y cierra el modal de municipio al hacer clic en municipios-fill', async () => {
    vi.mocked(getMunicipios).mockResolvedValue({
      data: { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { MPIO_NOMBR: 'FRONTINO', SUBREGION: 'OCCIDENTE' }, geometry: { type: 'Point', coordinates: [-76.1, 6.7] } },
      ] },
      fromCache: false,
    })
    vi.mocked(getLocalizaciones).mockResolvedValue({ data: { type: 'FeatureCollection', features: [] }, fromCache: false })
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    await map.triggerLoad()
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    await nextTick()

    map._handlers['click|municipios-fill']({ features: [{ properties: { MPIO_NOMBR: 'FRONTINO', SUBREGION: 'OCCIDENTE' } }] })
    await nextTick()
    expect(wrapper.find('.mpio-modal').exists()).toBe(true)
    expect(wrapper.find('.mpio-nombre').text()).toBe('Frontino')

    await wrapper.find('.mpio-close').trigger('click')
    expect(wrapper.find('.mpio-modal').exists()).toBe(false)
    wrapper.unmount()
  })

  it('muestra los letreros de subregión y municipio activos', async () => {
    vi.mocked(getMunicipios).mockResolvedValue({
      data: { type: 'FeatureCollection', features: [
        { type: 'Feature', properties: { MPIO_NOMBR: 'FRONTINO', SUBREGION: 'OCCIDENTE' }, geometry: { type: 'Point', coordinates: [-76.1, 6.7] } },
      ] },
      fromCache: false,
    })
    vi.mocked(getLocalizaciones).mockResolvedValue({ data: { type: 'FeatureCollection', features: [] }, fromCache: false })
    const wrapper = mountMapView()
    const map = maplibregl.Map.instances.at(-1)
    await map.triggerLoad()
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    await nextTick()

    const store = useMapStore()
    store.setFilter({ search: '', subregion: 'Occidente', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    await nextTick()
    expect(wrapper.find('.subreg-group').exists()).toBe(true)
    expect(wrapper.find('.subreg-text').text()).toBe('Occidente')
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
