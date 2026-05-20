import { ref, watch } from 'vue'

const API_PHOTOS = import.meta.env.VITE_API_PHOTOS
export const AZURE_PHOTOS_BASE = 'https://stsimevaqa.blob.core.windows.net/images/circuitos'

/**
 * Devuelve la URL de una foto en Azure Blob Storage.
 * tipo: 'antes' | 'durante' | 'despues'
 */
export function circuitPhotoUrl(circuito, tipo) {
  if (!circuito) return ''
  return `${AZURE_PHOTOS_BASE}/${encodeURIComponent(circuito)}/${tipo}.jpg`
}

/**
 * Devuelve { antes: [urls], durante: [urls], despues: [urls] }
 * para un circuito dado.
 *
 * - Si VITE_API_PHOTOS está definida: llama al endpoint JSON
 * - Si no: construye URLs directas al blob de Azure (un archivo por fase)
 */
export function useCircuitoPhotos(circuitoRef) {
  const photos  = ref({ antes: [], durante: [], despues: [] })
  const loading = ref(false)
  const error   = ref(null)

  function buildAzurePhotos(circuito) {
    photos.value = {
      antes:   [circuitPhotoUrl(circuito, 'antes')],
      durante: [circuitPhotoUrl(circuito, 'durante')],
      despues: [circuitPhotoUrl(circuito, 'despues')],
    }
  }

  async function loadFromApi(circuito) {
    loading.value = true
    error.value   = null
    try {
      const url = `${API_PHOTOS}/${encodeURIComponent(circuito)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      photos.value = data?.data ?? data
    } catch (err) {
      console.error('[SIMEVA] Error cargando fotos:', err)
      error.value  = err.message
      photos.value = { antes: [], durante: [], despues: [] }
    } finally {
      loading.value = false
    }
  }

  async function loadFromLocalApi(circuito) {
    loading.value = true
    error.value   = null
    try {
      const res = await fetch(`/api/circuito-photos/${encodeURIComponent(circuito)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      photos.value = await res.json()
    } catch (err) {
      error.value  = err.message
      photos.value = { antes: [], durante: [], despues: [] }
    } finally {
      loading.value = false
    }
  }

  function fetchPhotos(circuito) {
    if (!circuito) {
      photos.value = { antes: [], durante: [], despues: [] }
      return
    }
    if (API_PHOTOS) {
      loadFromApi(circuito)
    } else if (import.meta.env.DEV) {
      loadFromLocalApi(circuito)
    } else {
      buildAzurePhotos(circuito)
    }
  }

  watch(circuitoRef, (val) => fetchPhotos(val), { immediate: true })

  return { photos, loading, error }
}
