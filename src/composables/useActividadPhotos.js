import { ref, watch } from 'vue'

/**
 * Convierte el nombre de una actividad a slug de carpeta.
 * "Exploración de campo" → "exploracion-de-campo"
 */
export function slugifyActividad(nombre) {
  return (nombre ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Carga el manifiesto de slugs que tienen fotos para un circuito.
 * Expone hasPhotos(nombre) para saber si una actividad tiene fotos.
 */
export function useActividadManifest(circuitoRef) {
  const slugsWithPhotos = ref(new Set())

  async function load(circuito) {
    if (!circuito) { slugsWithPhotos.value = new Set(); return }
    try {
      const res = await fetch(`/api/actividad-photos/${encodeURIComponent(circuito)}`)
      if (!res.ok) throw new Error(res.status)
      const data = await res.json()
      slugsWithPhotos.value = new Set(data.slugs ?? [])
    } catch {
      slugsWithPhotos.value = new Set()
    }
  }

  watch(circuitoRef, val => load(val), { immediate: true })

  function hasPhotos(nombre) {
    return slugsWithPhotos.value.has(slugifyActividad(nombre))
  }

  function refresh() { load(circuitoRef.value) }

  return { slugsWithPhotos, hasPhotos, refresh }
}

/**
 * Carga las URLs de fotos para un circuito + slug de actividad.
 */
export function useActividadPhotos(circuitoRef, slugRef) {
  const urls    = ref([])
  const loading = ref(false)

  async function load(circuito, slug) {
    if (!circuito || !slug) { urls.value = []; return }
    loading.value = true
    try {
      const res = await fetch(`/api/actividad-photos/${encodeURIComponent(circuito)}/${slug}`)
      if (!res.ok) throw new Error(res.status)
      const data = await res.json()
      urls.value = data.urls ?? []
    } catch {
      urls.value = []
    } finally {
      loading.value = false
    }
  }

  watch([circuitoRef, slugRef], ([c, s]) => load(c, s), { immediate: true })

  return { urls, loading }
}
