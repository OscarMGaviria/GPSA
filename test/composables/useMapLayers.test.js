import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../src/services/api.js', () => ({
  getMunicipios: vi.fn(),
  getLocalizaciones: vi.fn(),
}))

import { getMunicipios, getLocalizaciones } from '../../src/services/api.js'
import { useMapLayers } from '../../src/composables/useMapLayers.js'

const MUNICIPIOS_FC = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { MPIO_NOMBR: 'FRONTINO', SUBREGION: 'OCCIDENTE' }, geometry: { type: 'Point', coordinates: [-76.1, 6.7] } },
    { type: 'Feature', properties: { MPIO_NOMBR: 'GUARNE', SUBREGION: 'ORIENTE' }, geometry: { type: 'Point', coordinates: [-75.4, 6.3] } },
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
    {
      type: 'Feature',
      properties: {
        NOMBRE_VIA: 'Guarne - Yolombal', CODIGO_VIA: 'V2', MPIO_NOMBR: 'GUARNE', SUBREGION: 'ORIENTE',
        CIRCUITO: 'Guarne - Yolombal', Long_km: '12', AV_FISICO: '0.8', AV_FINAN: '0.6', ESTABILIZADO: '3',
        CONTRATIST: 'CONSORCIO B', CTO: 'C2', INTERV: 'INT2', PLAZO_MESE: '6', FECHA_INI: '2024-02-01',
      },
      geometry: { type: 'LineString', coordinates: [[-75.4, 6.3], [-75.5, 6.4]] },
    },
  ],
}

function createMockMap() {
  const map = {
    sources: {},
    layers: {},
    handlers: {},
    getTerrain: vi.fn(() => null),
    addSource: vi.fn((id, opts) => { map.sources[id] = opts }),
    addLayer: vi.fn((layer) => { map.layers[layer.id] = layer }),
    on: vi.fn((event, a, b) => {
      if (typeof a === 'function') map.handlers[event] = a
      else map.handlers[`${event}|${a}`] = b
    }),
    setFilter: vi.fn(),
    setFeatureState: vi.fn(),
    getCanvas: vi.fn(() => ({ style: { cursor: '' } })),
  }
  return map
}

function makeComponent(getMap, callbacks, calloutCbs) {
  return defineComponent({
    setup() {
      return useMapLayers(getMap, callbacks, calloutCbs)
    },
    template: '<div></div>',
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(getMunicipios).mockReset()
  vi.mocked(getLocalizaciones).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useMapLayers — loadSimeva sin mapa', () => {
  it('no hace nada si getMap() retorna null', async () => {
    const wrapper = mount(makeComponent(() => null))
    await wrapper.vm.loadSimeva()
    expect(wrapper.vm.loading).toBe(true)
    wrapper.unmount()
  })
})

describe('useMapLayers — loadSimeva con éxito', () => {
  let map, onOptionsLoaded, onStatsLoaded, buildCallouts, updateCalloutPositions

  beforeEach(() => {
    map = createMockMap()
    onOptionsLoaded = vi.fn()
    onStatsLoaded = vi.fn()
    buildCallouts = vi.fn()
    updateCalloutPositions = vi.fn()
    vi.mocked(getMunicipios).mockResolvedValue({ data: MUNICIPIOS_FC, fromCache: false })
    vi.mocked(getLocalizaciones).mockResolvedValue({ data: VIAS_FC, fromCache: false })
  })

  it('carga los datos, apaga loading y guarda los GeoJSON cacheados', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    expect(wrapper.vm.loading).toBe(false)
    expect(wrapper.vm.loadError).toBe(false)
    expect(wrapper.vm.cachedMunicipios).toEqual(MUNICIPIOS_FC)
    expect(wrapper.vm.cachedVias).toEqual(VIAS_FC)
    wrapper.unmount()
  })

  it('construye las opciones de filtro correctamente', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    expect(onOptionsLoaded).toHaveBeenCalledTimes(1)
    const opts = onOptionsLoaded.mock.calls[0][0]
    expect(opts.subregiones).toEqual(['Todas las subregiones', 'Occidente', 'Oriente'])
    expect(opts.municipios).toEqual(['Todos los municipios', 'Frontino', 'Guarne'])
    expect(opts.circuitos).toEqual(['Todos los circuitos', 'Frontino - Nutibara', 'Guarne - Yolombal'])
    expect(opts.municipiosPorSubregion.Occidente).toEqual(['Frontino'])
    expect(opts.municipiosPorSubregion.Oriente).toEqual(['Guarne'])
    wrapper.unmount()
  })

  it('calcula las estadísticas de vías correctamente', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    expect(onStatsLoaded).toHaveBeenCalledTimes(1)
    const stats = onStatsLoaded.mock.calls[0][0]
    expect(stats.viasIntervenidas).toBe(2)
    expect(stats.longitudTotal).toBe(22)
    expect(stats.municipios).toBe(2)
    expect(stats.circuitos).toBe(2)
    expect(stats.viasDetalle.length).toBe(2)
    const frontino = stats.viasDetalle.find(v => v.nombre === 'El Botón - Frontino')
    expect(frontino.avance).toBe(50)
    expect(frontino.municipio).toBe('Frontino')
    expect(frontino.subregion).toBe('Occidente')
    // AV_FISICO=0.8 (<=1) se interpreta como fracción → 80%
    const guarne = stats.viasDetalle.find(v => v.nombre === 'Guarne - Yolombal')
    expect(guarne.avance).toBe(80)
    wrapper.unmount()
  })

  it('agrega las capas de municipios y vías al mapa', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'municipios-fill' }))
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'vias-line' }))
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'vias-hit-target' }))
    wrapper.unmount()
  })

  it('llama a buildCallouts con las features de vías', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    expect(buildCallouts).toHaveBeenCalledWith(VIAS_FC.features)
    wrapper.unmount()
  })

  it('selecciona un municipio al hacer clic en la capa municipios-fill', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    map.handlers['click|municipios-fill']({ features: [{ properties: { MPIO_NOMBR: 'FRONTINO', SUBREGION: 'OCCIDENTE' } }] })
    expect(wrapper.vm.selectedMpio).toEqual({ nombre: 'Frontino', subregion: 'Occidente' })
    wrapper.unmount()
  })

  it('selecciona una vía/circuito al hacer clic en vias-hit-target', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    map.handlers['click|vias-hit-target']({ features: [{ properties: VIAS_FC.features[0].properties }] })
    expect(wrapper.vm.selectedVia.name).toBe('Frontino - Nutibara')
    expect(wrapper.vm.selectedVia.description.Contratista).toBe('CONSORCIO A')
    expect(wrapper.vm.selectedMpio).toBeNull()
    wrapper.unmount()
  })

  it('actualiza viaHoverLabel en mousemove sobre vias-hit-target', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    map.handlers['mousemove|vias-hit-target']({ features: [{ properties: VIAS_FC.features[0].properties }], point: { x: 10, y: 20 } })
    expect(wrapper.vm.viaHoverLabel.visible).toBe(true)
    expect(wrapper.vm.viaHoverLabel.name).toBe('Frontino - Nutibara')
    expect(wrapper.vm.viaHoverLabel.x).toBe(10)
    wrapper.unmount()
  })

  it('oculta viaHoverLabel en mouseleave de vias-hit-target', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    map.handlers['mousemove|vias-hit-target']({ features: [{ properties: VIAS_FC.features[0].properties }], point: { x: 1, y: 2 } })
    map.handlers['mouseleave|vias-hit-target']()
    expect(wrapper.vm.viaHoverLabel.visible).toBe(false)
    wrapper.unmount()
  })

  it('resalta el municipio en mousemove y lo quita en mouseleave sobre municipios-fill', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    map.handlers['mousemove|municipios-fill']({ features: [{ id: 1, properties: MUNICIPIOS_FC.features[0].properties }] })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: 'municipios', id: 1 }, { hover: true })
    // Segundo mousemove sobre otro municipio: debe apagar el hover del anterior
    map.handlers['mousemove|municipios-fill']({ features: [{ id: 2, properties: MUNICIPIOS_FC.features[1].properties }] })
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: 'municipios', id: 1 }, { hover: false })
    map.handlers['mouseleave|municipios-fill']()
    expect(map.setFeatureState).toHaveBeenCalledWith({ source: 'municipios', id: 2 }, { hover: false })
    wrapper.unmount()
  })

  it('selecciona el municipio al hacer click sobre municipios-fill', async () => {
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }, { buildCallouts, updateCalloutPositions }))
    await wrapper.vm.loadSimeva()
    map.handlers['click|municipios-fill']({ features: [{ properties: MUNICIPIOS_FC.features[0].properties }] })
    expect(wrapper.vm.selectedMpio.nombre).toBe('Frontino')
    expect(wrapper.vm.selectedMpio.subregion).toBe('Occidente')
    wrapper.unmount()
  })
})

describe('useMapLayers — loadSimeva con errores', () => {
  it('marca loadError si ambas peticiones fallan', async () => {
    vi.mocked(getMunicipios).mockRejectedValue(new Error('fail municipios'))
    vi.mocked(getLocalizaciones).mockRejectedValue(new Error('fail vias'))
    const map = createMockMap()
    const wrapper = mount(makeComponent(() => map))
    await wrapper.vm.loadSimeva()
    expect(wrapper.vm.loadError).toBe(true)
    expect(wrapper.vm.loading).toBe(false)
    wrapper.unmount()
  })

  it('continúa si solo una de las dos peticiones fallan', async () => {
    vi.mocked(getMunicipios).mockResolvedValue({ data: MUNICIPIOS_FC, fromCache: false })
    vi.mocked(getLocalizaciones).mockRejectedValue(new Error('fail vias'))
    const map = createMockMap()
    const onOptionsLoaded = vi.fn()
    const onStatsLoaded = vi.fn()
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded, onStatsLoaded }))
    await wrapper.vm.loadSimeva()
    expect(wrapper.vm.loadError).toBe(false)
    expect(wrapper.vm.cachedVias).toBeNull()
    expect(wrapper.vm.cachedMunicipios).toEqual(MUNICIPIOS_FC)
    wrapper.unmount()
  })

  it('marca fromCache en true si alguna respuesta viene de caché', async () => {
    vi.mocked(getMunicipios).mockResolvedValue({ data: MUNICIPIOS_FC, fromCache: true })
    vi.mocked(getLocalizaciones).mockResolvedValue({ data: VIAS_FC, fromCache: false })
    const map = createMockMap()
    const wrapper = mount(makeComponent(() => map, { onOptionsLoaded: vi.fn(), onStatsLoaded: vi.fn() }))
    await wrapper.vm.loadSimeva()
    expect(wrapper.vm.fromCache).toBe(true)
    wrapper.unmount()
  })
})

describe('useMapLayers — desmontaje', () => {
  it('no continúa el procesamiento si el componente fue desmontado antes de resolver', async () => {
    let resolveMunicipios
    vi.mocked(getMunicipios).mockReturnValue(new Promise(r => { resolveMunicipios = r }))
    vi.mocked(getLocalizaciones).mockResolvedValue({ data: VIAS_FC, fromCache: false })
    const map = createMockMap()
    const onStatsLoaded = vi.fn()
    const wrapper = mount(makeComponent(() => map, { onStatsLoaded }))
    const promise = wrapper.vm.loadSimeva()
    wrapper.unmount()
    resolveMunicipios({ data: MUNICIPIOS_FC, fromCache: false })
    await promise
    expect(onStatsLoaded).not.toHaveBeenCalled()
  })
})
