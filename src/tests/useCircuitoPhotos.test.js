import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'

// Reset el módulo entre tests para limpiar el caché interno
beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function mockFetch(responseData, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    json: () => Promise.resolve(responseData),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('useCircuitoPhotos — modo local (manifest.json)', () => {
  it('retorna fotos vacías si idCircuito es null/vacío', async () => {
    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const idCircuito = ref('')
    const { photos, loading } = useCircuitoPhotos(idCircuito)
    await nextTick()
    expect(photos.value).toEqual({ antes: [], durante: [], despues: [] })
    expect(loading.value).toBe(false)
  })

  it('carga fotos desde el manifest cuando el idCircuito existe', async () => {
    const circuitPhotos = {
      antes:   ['/images/circuitos/C-001/antes/foto1.jpg', '/images/circuitos/C-001/antes/foto2.jpg'],
      durante: ['/images/circuitos/C-001/durante/foto3.jpg'],
      despues: [],
    }
    mockFetch(circuitPhotos)

    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const idCircuito = ref('C-001')
    const { photos, loading, error } = useCircuitoPhotos(idCircuito)

    // Esperar a que se resuelva el fetch
    await nextTick()
    await new Promise(r => setTimeout(r, 10))

    expect(error.value).toBeNull()
    expect(photos.value.antes.length).toBe(2)
    expect(photos.value.durante.length).toBe(1)
    expect(photos.value.despues.length).toBe(0)
  })

  it('construye las URLs correctas desde el manifest', async () => {
    const circuitPhotos = {
      antes:   ['/images/circuitos/C-002/antes/antes_01.jpg'],
      durante: [],
      despues: ['/images/circuitos/C-002/despues/despues_01.jpg'],
    }
    mockFetch(circuitPhotos)

    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const idCircuito = ref('C-002')
    const { photos } = useCircuitoPhotos(idCircuito)

    await nextTick()
    await new Promise(r => setTimeout(r, 10))

    expect(photos.value.antes[0]).toContain('/images/circuitos/')
    expect(photos.value.antes[0]).toContain('/antes/antes_01.jpg')
    expect(photos.value.despues[0]).toContain('/despues/despues_01.jpg')
  })

  it('retorna fotos vacías si el idCircuito no existe en el manifest', async () => {
    mockFetch({ antes: [], durante: [], despues: [] })

    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const idCircuito = ref('C-888')
    const { photos } = useCircuitoPhotos(idCircuito)

    await nextTick()
    await new Promise(r => setTimeout(r, 10))

    expect(photos.value).toEqual({ antes: [], durante: [], despues: [] })
  })

  it('registra el error si el fetch falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    }))

    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const idCircuito = ref('C-001')
    const { photos, error } = useCircuitoPhotos(idCircuito)

    await nextTick()
    await new Promise(r => setTimeout(r, 10))

    expect(error.value).toBeTruthy()
    expect(photos.value).toEqual({ antes: [], durante: [], despues: [] })
  })

  it('loading es false después de completar la carga', async () => {
    const circuitPhotos = { antes: ['/images/circuitos/C-003/antes/a.jpg'], durante: [], despues: [] }
    mockFetch(circuitPhotos)

    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const idCircuito = ref('C-003')
    const { loading } = useCircuitoPhotos(idCircuito)

    await nextTick()
    await new Promise(r => setTimeout(r, 10))

    expect(loading.value).toBe(false)
  })
})
