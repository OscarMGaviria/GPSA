import { ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'

export function useMapFilters(getMap, filtersRef, { cachedMunicipios, cachedVias, center, zoom, refreshVisibleCallouts } = {}) {
  const selectedSubregion = ref('')
  const selectedMunicipio = ref('')
  const noResults         = ref(false)

  function coordsBounds(coords, bounds) {
    if (typeof coords[0] === 'number') { bounds.extend(coords) }
    else coords.forEach(c => coordsBounds(c, bounds))
  }

  function flyToGeometry(geometry, opts = {}) {
    const map = getMap()
    const bounds = new maplibregl.LngLatBounds()
    coordsBounds(geometry.coordinates, bounds)
    if (!bounds.isEmpty()) map.fitBounds(bounds, { ...opts, duration: 900 })
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
        f => f.properties.mpio_nombr?.toUpperCase() === mpio.toUpperCase()
      )
      const raw = feat?.properties.subregion ?? ''
      selectedSubregion.value = raw
        ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
        : ''
    } else {
      selectedSubregion.value = ''
    }

    if (map.getLayer('municipios-fill')) {
      const mpioFilter = ['all']
      if (sub  && sub  !== 'Todas las subregiones')
        mpioFilter.push(['==', ['upcase', ['get', 'subregion']], sub.toUpperCase()])
      if (mpio && mpio !== 'Todos los municipios')
        mpioFilter.push(['==', ['upcase', ['get', 'mpio_nombr']], mpio.toUpperCase()])
      // Búsqueda de texto también filtra municipios por nombre
      if (search && !circuito)
        mpioFilter.push(['>', ['index-of', search, ['downcase', ['coalesce', ['get', 'mpio_nombr'], '']]], -1])
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
      let viasFilter = null
      if (circuito && circuito !== 'Todos los circuitos') {
        viasFilter = ['==', ['get', 'name'], circuito]
      } else if (search) {
        viasFilter = ['>', ['index-of', search, ['downcase', ['coalesce', ['get', 'name'], '']]], -1]
      }
      map.setFilter('vias-line',   viasFilter)
      map.setFilter('vias-casing', viasFilter)
    }

    // ── Zoom al feature coincidente ────────────────────────────────────────
    if (mpio && mpio !== 'Todos los municipios' && cachedMunicipios.value) {
      const feat = cachedMunicipios.value.features.find(
        f => f.properties.mpio_nombr?.toUpperCase() === mpio.toUpperCase()
      )
      if (feat) flyToGeometry(feat.geometry, { padding: 80 })
    } else if (sub && sub !== 'Todas las subregiones' && cachedMunicipios.value) {
      const feats = cachedMunicipios.value.features.filter(
        f => f.properties.subregion?.toUpperCase() === sub.toUpperCase()
      )
      if (feats.length) flyToGeometries(feats.map(f => f.geometry), { padding: 60 })
    } else if (circuito && circuito !== 'Todos los circuitos' && cachedVias.value) {
      const feat = cachedVias.value.features.find(f => f.properties.name === circuito)
      if (feat) flyToGeometry(feat.geometry, { padding: 80 })
    } else if (search) {
      // Zoom al primer municipio que coincida con el texto buscado
      const mpioMatch = cachedMunicipios.value?.features.find(
        f => f.properties.mpio_nombr?.toLowerCase().includes(search)
      )
      if (mpioMatch) {
        flyToGeometry(mpioMatch.geometry, { padding: 80 })
      } else {
        // Si no hay municipio, zoom a la primera vía que coincida
        const viaMatch = cachedVias.value?.features.find(
          f => f.properties.name?.toLowerCase().includes(search)
        )
        if (viaMatch) flyToGeometry(viaMatch.geometry, { padding: 80 })
      }
    } else {
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

    refreshVisibleCallouts?.(filters)
  }

  watch(filtersRef, (filters) => { applyFilters(filters) }, { deep: true })

  return { selectedSubregion, selectedMunicipio, noResults }
}
