import { ref, watch } from 'vue'

const API_PHOTOS = import.meta.env.VITE_API_PHOTOS
export const AZURE_PHOTOS_BASE = 'https://stsimevaqa.blob.core.windows.net/images/circuitos'

const pageLoadTs = Date.now()

/**
 * Devuelve la URL de una foto en Azure Blob Storage.
 * tipo: 'antes' | 'durante' | 'despues'
 */
export function circuitPhotoUrl(idCircuito, tipo) {
  if (!idCircuito) return ''
  return `${AZURE_PHOTOS_BASE}/${encodeURIComponent(idCircuito)}/${tipo}.png?t=${pageLoadTs}`
}

/**
 * Devuelve { antes: [urls], durante: [urls], despues: [urls] }
 * para un circuito dado.
 *
 * - Si VITE_API_PHOTOS está definida: llama al endpoint JSON
 * - Si no: construye URLs directas al blob de Azure (un archivo por fase)
 */
export function useCircuitoPhotos(idCircuitoRef) {
  const photos  = ref({ antes: [], durante: [], despues: [] })
  const loading = ref(false)
  const error   = ref(null)

  function buildAzurePhotos(idCircuito) {
    photos.value = {
      antes:   [circuitPhotoUrl(idCircuito, 'antes')],
      durante: [circuitPhotoUrl(idCircuito, 'durante')],
      despues: [circuitPhotoUrl(idCircuito, 'despues')],
    }
  }

  function applyCacheBuster(data) {
    if (!data) return { antes: [], durante: [], despues: [] }
    const result = { antes: [], durante: [], despues: [] }
    for (const phase of ['antes', 'durante', 'despues']) {
      result[phase] = (data[phase] || []).map(url => {
        const separator = url.includes('?') ? '&' : '?'
        return `${url}${separator}t=${pageLoadTs}`
      })
    }
    return result
  }

  async function loadFromApi(idCircuito) {
    loading.value = true
    error.value   = null
    try {
      const url = `${API_PHOTOS}/${encodeURIComponent(idCircuito)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = await res.json()
      const rawPhotos = data?.data ?? data
      photos.value = applyCacheBuster(rawPhotos)
    } catch (err) {
      console.error('[SIMEVA] Error cargando fotos:', err)
      error.value  = err.message
      photos.value = { antes: [], durante: [], despues: [] }
    } finally {
      loading.value = false
    }
  }

  async function loadFromLocalApi(idCircuito) {
    loading.value = true
    error.value   = null
    try {
      const res = await fetch(`/api/circuito-photos/${encodeURIComponent(idCircuito)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rawPhotos = await res.json()
      photos.value = applyCacheBuster(rawPhotos)
    } catch (err) {
      error.value  = err.message
      photos.value = { antes: [], durante: [], despues: [] }
    } finally {
      loading.value = false
    }
  }

  function fetchPhotos(idCircuito) {
    if (!idCircuito) {
      photos.value = { antes: [], durante: [], despues: [] }
      return
    }
    if (API_PHOTOS) {
      loadFromApi(idCircuito)
    } else if (import.meta.env.VITEST || import.meta.env.MODE === 'test' || (import.meta.env.DEV && !import.meta.env.VITE_ADMIN_API)) {
      loadFromLocalApi(idCircuito)
    } else {
      buildAzurePhotos(idCircuito)
    }
  }

  watch(idCircuitoRef, (val) => fetchPhotos(val), { immediate: true })

  return { photos, loading, error }
}
