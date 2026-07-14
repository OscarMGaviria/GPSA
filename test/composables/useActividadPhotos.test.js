import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mockFetch(responseData, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    json: () => Promise.resolve(responseData),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// slugifyActividad
// ─────────────────────────────────────────────────────────────────────────────
describe('slugifyActividad', () => {
  it('convierte a minúsculas y reemplaza espacios por guiones', async () => {
    const { slugifyActividad } = await import('../../src/composables/useActividadPhotos.js')
    expect(slugifyActividad('Exploración de campo')).toBe('exploracion-de-campo')
  })

  it('elimina caracteres que no sean letras, números o guiones', async () => {
    const { slugifyActividad } = await import('../../src/composables/useActividadPhotos.js')
    expect(slugifyActividad('Fase #1 (inicial)!!')).toBe('fase-1-inicial')
  })

  it('colapsa guiones múltiples en uno solo', async () => {
    const { slugifyActividad } = await import('../../src/composables/useActividadPhotos.js')
    expect(slugifyActividad('a   --  b')).toBe('a-b')
  })

  it('retorna string vacío si el nombre es null/undefined', async () => {
    const { slugifyActividad } = await import('../../src/composables/useActividadPhotos.js')
    expect(slugifyActividad(null)).toBe('')
    expect(slugifyActividad(undefined)).toBe('')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useActividadManifest
// ─────────────────────────────────────────────────────────────────────────────
describe('useActividadManifest', () => {
  it('deja el set vacío si el circuito es falsy', async () => {
    const { useActividadManifest } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('')
    const { slugsWithPhotos } = useActividadManifest(circuito)
    await nextTick()
    expect(slugsWithPhotos.value.size).toBe(0)
  })

  it('carga los slugs con fotos desde el manifiesto', async () => {
    mockFetch({ slugs: ['exploracion-de-campo', 'fase-1'] })
    const { useActividadManifest } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('C-001')
    const { slugsWithPhotos, hasPhotos } = useActividadManifest(circuito)
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(slugsWithPhotos.value.has('exploracion-de-campo')).toBe(true)
    expect(hasPhotos('Exploración de campo')).toBe(true)
    expect(hasPhotos('Otra actividad')).toBe(false)
  })

  it('deja el set vacío si el fetch falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const { useActividadManifest } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('C-002')
    const { slugsWithPhotos } = useActividadManifest(circuito)
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(slugsWithPhotos.value.size).toBe(0)
  })

  it('deja el set vacío si la respuesta no es ok', async () => {
    mockFetch({}, false)
    const { useActividadManifest } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('C-003')
    const { slugsWithPhotos } = useActividadManifest(circuito)
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(slugsWithPhotos.value.size).toBe(0)
  })

  it('refresh() vuelve a cargar el manifiesto del circuito actual', async () => {
    mockFetch({ slugs: ['a'] })
    const { useActividadManifest } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('C-004')
    const { slugsWithPhotos, refresh } = useActividadManifest(circuito)
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(slugsWithPhotos.value.has('a')).toBe(true)

    mockFetch({ slugs: ['b'] })
    refresh()
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(slugsWithPhotos.value.has('b')).toBe(true)
    expect(slugsWithPhotos.value.has('a')).toBe(false)
  })

  it('recarga automáticamente cuando cambia el circuito', async () => {
    mockFetch({ slugs: ['x'] })
    const { useActividadManifest } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('C-005')
    const { slugsWithPhotos } = useActividadManifest(circuito)
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(slugsWithPhotos.value.has('x')).toBe(true)

    mockFetch({ slugs: ['y'] })
    circuito.value = 'C-006'
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(slugsWithPhotos.value.has('y')).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// useActividadPhotos
// ─────────────────────────────────────────────────────────────────────────────
describe('useActividadPhotos', () => {
  it('deja urls vacías si falta circuito o slug', async () => {
    const { useActividadPhotos } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('')
    const slug = ref('fase-1')
    const { urls, loading } = useActividadPhotos(circuito, slug)
    await nextTick()
    expect(urls.value).toEqual([])
    expect(loading.value).toBe(false)
  })

  it('carga las urls de fotos cuando circuito y slug existen', async () => {
    mockFetch({ urls: ['/img/a.jpg', '/img/b.jpg'] })
    const { useActividadPhotos } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('C-001')
    const slug = ref('fase-1')
    const { urls, loading } = useActividadPhotos(circuito, slug)
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(urls.value).toEqual(['/img/a.jpg', '/img/b.jpg'])
    expect(loading.value).toBe(false)
  })

  it('deja urls vacías si el fetch falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const { useActividadPhotos } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('C-001')
    const slug = ref('fase-1')
    const { urls } = useActividadPhotos(circuito, slug)
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(urls.value).toEqual([])
  })

  it('deja urls vacías si la respuesta no es ok', async () => {
    mockFetch({}, false)
    const { useActividadPhotos } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('C-001')
    const slug = ref('fase-1')
    const { urls } = useActividadPhotos(circuito, slug)
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(urls.value).toEqual([])
  })

  it('recarga al cambiar el slug', async () => {
    mockFetch({ urls: ['/img/a.jpg'] })
    const { useActividadPhotos } = await import('../../src/composables/useActividadPhotos.js')
    const circuito = ref('C-001')
    const slug = ref('fase-1')
    const { urls } = useActividadPhotos(circuito, slug)
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(urls.value).toEqual(['/img/a.jpg'])

    mockFetch({ urls: ['/img/b.jpg'] })
    slug.value = 'fase-2'
    await nextTick()
    await new Promise(r => setTimeout(r, 10))
    expect(urls.value).toEqual(['/img/b.jpg'])
  })
})
