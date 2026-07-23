import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mockFetchOnce(text, ok = true, status = ok ? 200 : 500) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status,
    arrayBuffer: () => Promise.resolve(new TextEncoder().encode(text).buffer),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// extractPhotos
// ─────────────────────────────────────────────────────────────────────────────
describe('extractPhotos', () => {
  it('retorna [] si el html es falsy', async () => {
    const { extractPhotos } = await import('../../src/services/api.js')
    expect(extractPhotos('')).toEqual([])
    expect(extractPhotos(null)).toEqual([])
  })

  it('extrae las URLs http(s) de las imágenes', async () => {
    const { extractPhotos } = await import('../../src/services/api.js')
    const html = '<div><img src="https://example.com/a.jpg"><img src="http://example.com/b.jpg"></div>'
    expect(extractPhotos(html)).toEqual(['https://example.com/a.jpg', 'http://example.com/b.jpg'])
  })

  it('ignora imágenes sin src http(s)', async () => {
    const { extractPhotos } = await import('../../src/services/api.js')
    const html = '<div><img src="/local/a.jpg"><img src="data:image/png;base64,xxx"></div>'
    expect(extractPhotos(html)).toEqual([])
  })

  it('retorna [] si el parseo del HTML falla', async () => {
    const spy = vi.spyOn(DOMParser.prototype, 'parseFromString').mockImplementation(() => { throw new Error('boom') })
    const { extractPhotos } = await import('../../src/services/api.js')
    expect(extractPhotos('<div></div>')).toEqual([])
    spy.mockRestore()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// extractPhotosByPhase
// ─────────────────────────────────────────────────────────────────────────────
describe('extractPhotosByPhase', () => {
  it('clasifica URLs según la clave de la propiedad', async () => {
    const { extractPhotosByPhase } = await import('../../src/services/api.js')
    const props = {
      foto_antes: 'https://ej.com/antes1.jpg',
      foto_durante: 'https://ej.com/durante1.jpg',
      foto_despues: 'https://ej.com/despues1.jpg',
    }
    const result = extractPhotosByPhase(props, '')
    expect(result.antes).toEqual(['https://ej.com/antes1.jpg'])
    expect(result.durante).toEqual(['https://ej.com/durante1.jpg'])
    expect(result.despues).toEqual(['https://ej.com/despues1.jpg'])
  })

  it('usa el HTML de descripción como fallback en "durante" si no hay props con fotos', async () => {
    const { extractPhotosByPhase } = await import('../../src/services/api.js')
    const html = '<img src="https://ej.com/x.jpg">'
    const result = extractPhotosByPhase({ otraProp: 'valor' }, html)
    expect(result.durante).toEqual(['https://ej.com/x.jpg'])
    expect(result.antes).toEqual([])
    expect(result.despues).toEqual([])
  })

  it('retorna las 3 fases vacías si no hay nada que extraer', async () => {
    const { extractPhotosByPhase } = await import('../../src/services/api.js')
    const result = extractPhotosByPhase({}, '')
    expect(result).toEqual({ antes: [], durante: [], despues: [] })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calcGeomKm
// ─────────────────────────────────────────────────────────────────────────────
describe('calcGeomKm', () => {
  it('retorna 0 si no hay geometría', async () => {
    const { calcGeomKm } = await import('../../src/services/api.js')
    expect(calcGeomKm(null)).toBe(0)
  })

  it('retorna 0 para un tipo de geometría no soportado', async () => {
    const { calcGeomKm } = await import('../../src/services/api.js')
    expect(calcGeomKm({ type: 'Point', coordinates: [0, 0] })).toBe(0)
  })

  it('calcula la distancia de un LineString con Haversine', async () => {
    const { calcGeomKm } = await import('../../src/services/api.js')
    // Un grado de latitud son ~111km
    const km = calcGeomKm({ type: 'LineString', coordinates: [[0, 0], [0, 1]] })
    expect(km).toBeGreaterThan(110)
    expect(km).toBeLessThan(112)
  })

  it('suma las distancias de un MultiLineString', async () => {
    const { calcGeomKm } = await import('../../src/services/api.js')
    const single = calcGeomKm({ type: 'LineString', coordinates: [[0, 0], [0, 1]] })
    const multi = calcGeomKm({
      type: 'MultiLineString',
      coordinates: [[[0, 0], [0, 1]], [[0, 0], [0, 1]]],
    })
    expect(multi).toBeCloseTo(single * 2, 5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// extractKm
// ─────────────────────────────────────────────────────────────────────────────
describe('extractKm', () => {
  it('retorna null si desc no es un objeto', async () => {
    const { extractKm } = await import('../../src/services/api.js')
    expect(extractKm(null)).toBeNull()
    expect(extractKm('texto')).toBeNull()
  })

  it('extrae el km desde una clave "Longitud"', async () => {
    const { extractKm } = await import('../../src/services/api.js')
    expect(extractKm({ Longitud: '12,5' })).toBe(12.5)
  })

  it('extrae el km desde una clave "Km"', async () => {
    const { extractKm } = await import('../../src/services/api.js')
    expect(extractKm({ Km: '8.3' })).toBe(8.3)
  })

  it('usa el fallback buscando el patrón "X km" en cualquier valor', async () => {
    const { extractKm } = await import('../../src/services/api.js')
    expect(extractKm({ descripcion: 'Tramo de 4.2 km de longitud' })).toBe(4.2)
  })

  it('retorna null si no encuentra ningún valor de km', async () => {
    const { extractKm } = await import('../../src/services/api.js')
    expect(extractKm({ otro: 'sin datos' })).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// parseDescription
// ─────────────────────────────────────────────────────────────────────────────
describe('parseDescription', () => {
  it('retorna {} si el html es falsy', async () => {
    const { parseDescription } = await import('../../src/services/api.js')
    expect(parseDescription('')).toEqual({})
  })

  it('parsea las filas de una tabla en pares clave-valor', async () => {
    const { parseDescription } = await import('../../src/services/api.js')
    const html = '<table><tr><td>Municipio</td><td>Frontino</td></tr><tr><td>Km</td><td>12.5</td></tr></table>'
    expect(parseDescription(html)).toEqual({ Municipio: 'Frontino', Km: '12.5' })
  })

  it('ignora filas sin al menos 2 celdas', async () => {
    const { parseDescription } = await import('../../src/services/api.js')
    const html = '<table><tr><td>SoloUnaCelda</td></tr></table>'
    expect(parseDescription(html)).toEqual({})
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getLocalizaciones / getMunicipios (fetchGeoJSON + caché + recuperación)
// ─────────────────────────────────────────────────────────────────────────────
describe('getLocalizaciones — fetch y parseo', () => {
  it('descarga y parsea un FeatureCollection válido', async () => {
    mockFetchOnce(JSON.stringify({ type: 'FeatureCollection', features: [] }))
    const { getLocalizaciones } = await import('../../src/services/api.js')
    const { data, fromCache } = await getLocalizaciones()
    expect(fromCache).toBe(false)
    expect(data.type).toBe('FeatureCollection')
  })

  it('desempaqueta el wrapper { success, data: FeatureCollection }', async () => {
    mockFetchOnce(JSON.stringify({ success: true, data: { type: 'FeatureCollection', features: [{ id: 1 }] } }))
    const { getLocalizaciones } = await import('../../src/services/api.js')
    const { data } = await getLocalizaciones()
    expect(data.features).toEqual([{ id: 1 }])
  })

  it('lanza un error si la respuesta HTTP no es ok y no hay caché', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const { getLocalizaciones } = await import('../../src/services/api.js')
    await expect(getLocalizaciones()).rejects.toThrow()
  })

  it('usa la caché en memoria cuando el fetch falla tras una carga previa exitosa', async () => {
    mockFetchOnce(JSON.stringify({ type: 'FeatureCollection', features: [{ id: 1 }] }))
    const { getLocalizaciones } = await import('../../src/services/api.js')
    await getLocalizaciones()

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))
    const { data, fromCache } = await getLocalizaciones()
    expect(fromCache).toBe(true)
    expect(data.features).toEqual([{ id: 1 }])
  })

  it('recupera features de un JSON truncado', async () => {
    const truncated = '{"type":"FeatureCollection","features":[{"id":1,"a":"x"},{"id":2,"a":"y"},{"id":3,"a":'
    mockFetchOnce(truncated)
    const { getLocalizaciones } = await import('../../src/services/api.js')
    const { data, fromCache } = await getLocalizaciones()
    expect(fromCache).toBe(false)
    expect(data.type).toBe('FeatureCollection')
    expect(data.features.length).toBe(2)
  })

  it('usa la caché si el JSON es inválido y no se puede recuperar ningún feature', async () => {
    mockFetchOnce(JSON.stringify({ type: 'FeatureCollection', features: [{ id: 1 }] }))
    const { getLocalizaciones } = await import('../../src/services/api.js')
    await getLocalizaciones() // popula la caché en memoria

    // Clave "features" no vacía pero con contenido no parseable como JSON válido
    mockFetchOnce('{"type":"FeatureCollection","features":[{id:1}]')
    const { data, fromCache } = await getLocalizaciones()
    expect(fromCache).toBe(true)
    expect(data.features).toEqual([{ id: 1 }])
  })

  it('lanza error si el JSON es inválido, no recuperable y no hay caché', async () => {
    mockFetchOnce('{"type":"FeatureCollection","features":[{id:1}]')
    const { getLocalizaciones } = await import('../../src/services/api.js')
    await expect(getLocalizaciones()).rejects.toThrow('No se pudo parsear')
  })
})
