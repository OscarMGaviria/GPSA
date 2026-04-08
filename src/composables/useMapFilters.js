import { ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import { useMapStore } from '../stores/useMapStore.js'

export function useMapFilters(getMap, filtersRef, { cachedMunicipios, cachedVias, center, zoom, refreshVisibleCallouts } = {}) {
  const store = useMapStore()
  const selectedSubregion = ref('')
  const selectedMunicipio = ref('')
  const noResults         = ref(false)

  function coordsBounds(coords, bounds) {
    if (typeof coords[0] === 'number') { bounds.extend(coords) }
    else coords.forEach(c => coordsBounds(c, bounds))
  }

  let _zoomLocked = false

  function lockZoom() {
    const map = getMap()
    if (!map || _zoomLocked) return
    map.scrollZoom.disable()
    map.doubleClickZoom.disable()
    map.touchZoomRotate.disable()
    map.keyboard.disable()
    _zoomLocked = true
  }

  function unlockZoom() {
    const map = getMap()
    if (!map || !_zoomLocked) return
    map.scrollZoom.enable()
    map.doubleClickZoom.enable()
    map.touchZoomRotate.enable()
    map.keyboard.enable()
    _zoomLocked = false
  }

  function flyToGeometries(geometries, opts = {}) {
    const map = getMap()
    const bounds = new maplibregl.LngLatBounds()
    geometries.forEach(g => coordsBounds(g.coordinates, bounds))
    if (!bounds.isEmpty()) map.fitBounds(bounds, { ...opts, duration: 900 })
  }

  function applyFilters(filters) {
    const map = getMap()
    if (!map) return

    const sub      = filters.subregion ?? ''
    const mpio     = filters.municipio ?? ''
    const circuito = filters.circuito  ?? ''
    const search   = (filters.search   ?? '').toLowerCase()

    selectedMunicipio.value = (mpio && mpio !== 'Todos los municipios') ? mpio : ''

    if (sub && sub !== 'Todas las subregiones') {
      selectedSubregion.value = sub
    } else if (selectedMunicipio.value && cachedMunicipios.value) {
      // Inferir subregión del municipio seleccionado
      const feat = cachedMunicipios.value.features.find(
        f => f.properties.MPIO_NOMBR?.toUpperCase() === mpio.toUpperCase()
      )
      const raw = feat?.properties.SUBREGION ?? ''
      selectedSubregion.value = raw
        ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
        : ''
    } else {
      selectedSubregion.value = ''
    }

    if (map.getLayer('municipios-fill')) {
      const mpioFilter = ['all']
      if (sub  && sub  !== 'Todas las subregiones')
        mpioFilter.push(['==', ['upcase', ['get', 'SUBREGION']], sub.toUpperCase()])
      if (mpio && mpio !== 'Todos los municipios')
        mpioFilter.push(['==', ['upcase', ['get', 'MPIO_NOMBR']], mpio.toUpperCase()])
      // Búsqueda de texto también filtra municipios por nombre
      if (search && !circuito)
        mpioFilter.push(['>', ['index-of', search, ['downcase', ['coalesce', ['get', 'MPIO_NOMBR'], '']]], -1])
      const f = mpioFilter.length > 1 ? mpioFilter : null
      map.setFilter('municipios-fill',    f)
      map.setFilter('municipios-outline', f)
      if (map.getLayer('municipios-labels')) {
        map.setFilter('municipios-labels', f)
        const hasGeoFilter = sub !== 'Todas las subregiones' || mpio !== 'Todos los municipios' || !!search
        map.setLayoutProperty('municipios-labels', 'visibility', hasGeoFilter ? 'visible' : 'none')
      }
    }

    if (map.getLayer('vias-line')) {
      const hasSub  = sub      && sub      !== 'Todas las subregiones'
      const hasMpio = mpio     && mpio     !== 'Todos los municipios'
      const hasCir  = circuito && circuito !== 'Todos los circuitos'
      const hasAny  = hasSub || hasMpio || hasCir || !!search

      let viasFilter = null
      if (hasAny) {
        const names = store.filteredStats.viasDetalle.map(v => v.nombre)
        viasFilter = names.length
          ? ['in', ['get', 'name'], ['literal', names]]
          : ['==', ['literal', false], ['literal', true]]
      }
      map.setFilter('vias-line',   viasFilter)
      map.setFilter('vias-casing', viasFilter)
    }

    // ── Zoom + lock/unlock ─────────────────────────────────────────────────
    const hasSub  = sub      && sub      !== 'Todas las subregiones'
    const hasMpio = mpio     && mpio     !== 'Todos los municipios'
    const hasCir  = circuito && circuito !== 'Todos los circuitos'
    const hasAnyFilter = hasSub || hasMpio || hasCir || !!search

    if (hasAnyFilter && cachedMunicipios.value) {
      let feats = cachedMunicipios.value.features
      if (hasMpio) {
        feats = feats.filter(f => f.properties.MPIO_NOMBR?.toUpperCase() === mpio.toUpperCase())
      } else if (hasSub) {
        feats = feats.filter(f => f.properties.SUBREGION?.toUpperCase() === sub.toUpperCase())
      } else if (hasCir && cachedVias.value) {
        const via = cachedVias.value.features.find(f => f.properties.name === circuito)
        if (via) flyToGeometries([via.geometry], { padding: 100 })
        feats = []
      } else if (search && cachedVias.value) {
        const searchNames = new Set(store.filteredStats.viasDetalle.map(v => v.nombre))
        const vias = cachedVias.value.features.filter(f => searchNames.has(f.properties.name))
        if (vias.length) flyToGeometries(vias.map(f => f.geometry), { padding: 100 })
        feats = []
      }
      if (feats.length) flyToGeometries(feats.map(f => f.geometry), { padding: 60 })

      // Calcular etiquetas DESPUÉS de que el mapa termine de animarse
      map.once('moveend', () => {
        lockZoom()
        refreshVisibleCallouts?.(filters)
      })
    } else {
      unlockZoom()
      refreshVisibleCallouts?.(filters)
      map.flyTo({ center, zoom, duration: 900 })
    }

    // ── Detección de sin-resultados ────────────────────────────────────────
    if (cachedVias.value) {
      const hasTextFilter = !!(search || (circuito && circuito !== 'Todos los circuitos'))
      if (hasTextFilter) {
        let count
        if (circuito && circuito !== 'Todos los circuitos') {
          count = cachedVias.value.features.filter(f => f.properties.name === circuito).length
        } else {
          count = cachedVias.value.features.filter(
            f => f.properties.name?.toLowerCase().includes(search)
          ).length
        }
        noResults.value = count === 0
      } else {
        noResults.value = false
      }
    } else {
      noResults.value = false
    }
  }

  watch(filtersRef, (filters) => { applyFilters(filters) }, { deep: true })

  return { selectedSubregion, selectedMunicipio, noResults }
}
