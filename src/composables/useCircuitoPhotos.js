import { ref, watch } from 'vue'

const API_PHOTOS = import.meta.env.VITE_API_PHOTOS

// Caché en memoria para no re-fetch el manifest en cada modal
let _manifestCache = null

async function loadManifest() {
  if (_manifestCache) return _manifestCache
  const res  = await fetch('/images/manifest.json')
  if (!res.ok) throw new Error('No se pudo cargar el manifest de fotos')
  _manifestCache = await res.json()
  return _manifestCache
}

/**
 * Devuelve { antes: [urls], durante: [urls], despues: [urls] }
 * para un circuito dado.
 *
 * - Si VITE_API_PHOTOS está definida: llama al endpoint
 * - Si no: carga desde /images/manifest.json (modo local)
 */
export function useCircuitoPhotos(circuitoRef) {
  const photos  = ref({ antes: [], durante: [], despues: [] })
  const loading = ref(false)
  const error   = ref(null)

  async function fetchPhotos(circuito) {
    if (!circuito) {
      photos.value = { antes: [], durante: [], despues: [] }
      return
    }

    loading.value = true
    error.value   = null

    try {
      if (API_PHOTOS) {
        // ── Modo API ────────────────────────────────────────────────────────
        const url = `${API_PHOTOS}/${encodeURIComponent(circuito)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = await res.json()
        // Espera { antes: [urls], durante: [urls], despues: [urls] }
        // o wrapper { data: { antes, durante, despues } }
        photos.value = data?.data ?? data
      } else {
        // ── Modo local (manifest.json) ───────────────────────────────────
        const manifest = await loadManifest()
        const entry    = manifest[circuito]

        if (!entry) {
          photos.value = { antes: [], durante: [], despues: [] }
          return
        }

        const base   = `/images/circuitos/${encodeURIComponent(circuito)}`
        photos.value = {
          antes:   (entry.antes   || []).map(f => `${base}/antes/${f}`),
          durante: (entry.durante || []).map(f => `${base}/durante/${f}`),
          despues: (entry.despues || []).map(f => `${base}/despues/${f}`),
        }
      }
    } catch (err) {
      console.error('[SIMEVA] Error cargando fotos:', err)
      error.value  = err.message
      photos.value = { antes: [], durante: [], despues: [] }
    } finally {
      loading.value = false
    }
  }

  watch(circuitoRef, (val) => fetchPhotos(val), { immediate: true })

  return { photos, loading, error }
}
