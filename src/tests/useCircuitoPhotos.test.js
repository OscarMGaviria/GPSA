import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'

// Reset el módulo entre tests para limpiar el caché interno de manifest
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
  it('retorna fotos vacías si circuito es null/vacío', async () => {
    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const circuito = ref('')
    const { photos, loading } = useCircuitoPhotos(circuito)
    await nextTick()
    expect(photos.value).toEqual({ antes: [], durante: [], despues: [] })
    expect(loading.value).toBe(false)
  })

  it('carga fotos desde el manifest cuando el circuito existe', async () => {
    const manifest = {
      'Frontino - Nutibara': {
        antes:   ['foto1.jpg', 'foto2.jpg'],
        durante: ['foto3.jpg'],
        despues: [],
      },
    }
    mockFetch(manifest)

    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const circuito = ref('Frontino - Nutibara')
    const { photos, loading, error } = useCircuitoPhotos(circuito)

    // Esperar a que se resuelva el fetch
    await nextTick()
    await new Promise(r => setTimeout(r, 10))

    expect(error.value).toBeNull()
    expect(photos.value.antes.length).toBe(2)
    expect(photos.value.durante.length).toBe(1)
    expect(photos.value.despues.length).toBe(0)
  })

  it('construye las URLs correctas desde el manifest', async () => {
    const manifest = {
      'Guarne - Yolombal': {
        antes:   ['antes_01.jpg'],
        durante: [],
        despues: ['despues_01.jpg'],
      },
    }
    mockFetch(manifest)

    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const circuito = ref('Guarne - Yolombal')
    const { photos } = useCircuitoPhotos(circuito)

    await nextTick()
    await new Promise(r => setTimeout(r, 10))

    expect(photos.value.antes[0]).toContain('/images/circuitos/')
    expect(photos.value.antes[0]).toContain('/antes/antes_01.jpg')
    expect(photos.value.despues[0]).toContain('/despues/despues_01.jpg')
  })

  it('retorna fotos vacías si el circuito no existe en el manifest', async () => {
    mockFetch({ 'Otro Circuito': { antes: [], durante: [], despues: [] } })

    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const circuito = ref('Circuito Inexistente')
    const { photos } = useCircuitoPhotos(circuito)

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
    const circuito = ref('Frontino - Nutibara')
    const { photos, error } = useCircuitoPhotos(circuito)

    await nextTick()
    await new Promise(r => setTimeout(r, 10))

    expect(error.value).toBeTruthy()
    expect(photos.value).toEqual({ antes: [], durante: [], despues: [] })
  })

  it('loading es false después de completar la carga', async () => {
    const manifest = { 'Circuito X': { antes: ['a.jpg'], durante: [], despues: [] } }
    mockFetch(manifest)

    const { useCircuitoPhotos } = await import('../composables/useCircuitoPhotos.js')
    const circuito = ref('Circuito X')
    const { loading } = useCircuitoPhotos(circuito)

    await nextTick()
    await new Promise(r => setTimeout(r, 10))

    expect(loading.value).toBe(false)
  })
})
