import { ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import { useMapStore } from '../stores/useMapStore.js'

const normUp = s => (s ?? '').normalize('NFD').replaceAll(/[̀-ͯ]/g, '').toUpperCase()

function _getMpioFillColor(isTerrain, isOnlySubregionActive) {
  if (isTerrain) {
    return isOnlySubregionActive ? ['case', ['==', ['get', '_hasVias'], 1], '#0369a1', '#0284c7'] : ['literal', '#0284c7']
  }
  return isOnlySubregionActive ? ['case', ['==', ['get', '_hasVias'], 1], '#0b5640', '#2d8653'] : ['literal', '#2d8653']
}

function _getMpioFillOpacity(isTerrain, isOnlySubregionActive) {
  if (isTerrain) return isOnlySubregionActive
    ? ['case', ['boolean', ['feature-state', 'hover'], false], 0.4, ['==', ['get', '_hasVias'], 1], 0.26, 0.06]
    : ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0.1]
  return isOnlySubregionActive
    ? ['case', ['boolean', ['feature-state', 'hover'], false], 0.35, ['==', ['get', '_hasVias'], 1], 0.22, 0.04]
    : ['case', ['boolean', ['feature-state', 'hover'], false], 0.22, 0.07]
}

function _applyMpioStyle(map, { hasSub, hasMpio, search, circuito, sub, mpio }) {
  if (!map.getLayer('municipios-fill')) return
  const mpioFilter = ['all']
  if (hasSub) mpioFilter.push(['==', ['get', '_subregionNorm'], normUp(sub)])
  if (hasMpio) mpioFilter.push(['==', ['get', '_mpioNorm'], normUp(mpio)])
  if (search && !proyecto) mpioFilter.push(['>', ['index-of', search, ['downcase', ['coalesce', ['get', 'MPIO_NOMBR'], '']]], -1])
  
  const f = mpioFilter.length > 1 ? mpioFilter : null
  map.setFilter('municipios-fill', f)
  map.setFilter('municipios-outline', f)
  if (map.getLayer('municipios-labels')) {
    map.setFilter('municipios-labels', f)
    const hasGeoFilter = hasSub || hasMpio || !!search
    map.setLayoutProperty('municipios-labels', 'visibility', hasGeoFilter ? 'visible' : 'none')
  }

  const isTerrain = !!map.getTerrain()
  const isOnlySubregionActive = hasSub && !hasMpio && !proyecto && !search

  map.setPaintProperty('municipios-fill', 'fill-color', _getMpioFillColor(isTerrain, isOnlySubregionActive))
  map.setPaintProperty('municipios-fill', 'fill-opacity', _getMpioFillOpacity(isTerrain, isOnlySubregionActive))
}

export function useMapFilters(getMap, filtersRef, { cachedMunicipios, cachedVias, cachedLocalizaciones, center, zoom, refreshVisibleCallouts } = {}) {
  const store = useMapStore()
  const selectedSubregion = ref('')
  const selectedMunicipio = ref('')
  const noResults         = ref(false)

  function coordsBounds(coords, bounds) {
    if (typeof coords[0] === 'number') { bounds.extend(coords) }
    else coords.forEach(c => coordsBounds(c, bounds))
  }


  function flyToGeometries(geometries, opts = {}) {
    const map = getMap()
    const bounds = new maplibregl.LngLatBounds()
    geometries.forEach(g => coordsBounds(g.coordinates, bounds))
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        ...opts,
        duration: 3000,
        essential: true
      })
    }
  }

  function _updateSelections(mpio, sub) {
    selectedMunicipio.value = (mpio && mpio !== 'Todos los municipios') ? mpio : ''
    if (sub && sub !== 'Todas las subregiones') {
      selectedSubregion.value = sub
    } else if (selectedMunicipio.value && cachedMunicipios.value) {
      const feat = cachedMunicipios.value.features.find(
        f => normUp(f.properties.MPIO_NOMBR) === normUp(mpio)
      )
      const raw = feat?.properties.SUBREGION ?? ''
      selectedSubregion.value = raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : ''
    } else {
      selectedSubregion.value = ''
    }
  }


  function _applyViasStyle(map, { hasAny, hasSub, hasMpio, hasCir, sub, mpio, circuito }) {
    if (!map.getLayer('vias-line')) return
    let viasFilter = null
    if (hasAny) {
      const expressions = ['all']
      if (hasSub) expressions.push(['==', ['get', '_subregionNorm'], normUp(sub)])
      if (hasMpio) expressions.push(['==', ['get', '_mpioNorm'], normUp(mpio)])
      if (hasCir) expressions.push(['==', ['coalesce', ['get', 'nombre'], ''], proyecto])

      const names = store.filteredStats.viasDetalle.map(v => v.nombre)
      if (names.length) {
        expressions.push(['in', ['get', 'NOMBRE_VIA'], ['literal', names]])
      } else {
        expressions.push(['==', ['literal', false], ['literal', true]])
      }
      viasFilter = expressions.length > 1 ? expressions : expressions[0]
    }
    map.setFilter('vias-line', viasFilter)
    map.setFilter('vias-casing', viasFilter)
    if (map.getLayer('vias-hit-target')) {
      map.setFilter('vias-hit-target', viasFilter)
    }
  }

  function _flyToMpios(map, feats, filters) {
    if (feats.length) flyToGeometries(feats.map(f => f.geometry), { padding: 60 })
    map.once('moveend', () => refreshVisibleCallouts?.(filters))
  }

  function _resetFlight(map, filters) {
    refreshVisibleCallouts?.(filters)
    if (cachedMunicipios?.value) {
      flyToGeometries(cachedMunicipios.value.features.map(f => f.geometry), { padding: 40 })
    } else {
      map.flyTo({ center, zoom, duration: 400 })
    }
  }

  function _handleFlightAndLabels(map, filters, { hasAny, hasMpio, hasSub, hasCir, search, mpio, sub, proyecto }) {
    if (!hasAny) return _resetFlight(map, filters)
    if (!cachedMunicipios.value) return

    let feats = cachedMunicipios.value.features
    if (hasMpio) {
      feats = feats.filter(f => normUp(f.properties.MPIO_NOMBR) === normUp(mpio))
      _flyToMpios(map, feats, filters)
    } else if (hasSub) {
      feats = feats.filter(f => normUp(f.properties.SUBREGION) === normUp(sub))
      _flyToMpios(map, feats, filters)
    } else if (hasCir) {
      let featsToFly = []
      if (cachedLocalizaciones?.value?.features) {
        const feats = cachedLocalizaciones.value.features.filter(f => f.properties.NOMBRE_PROYECTO === proyecto)
        featsToFly = featsToFly.concat(feats)
      }
      if (cachedVias?.value?.features) {
        const searchNames = new Set(store.filteredStats.viasDetalle.map(v => v.nombre))
        const vias = cachedVias.value.features.filter(f => searchNames.has(f.properties.NOMBRE_VIA))
        featsToFly = featsToFly.concat(vias)
      }
      
      if (featsToFly.length) {
        flyToGeometries(featsToFly.map(f => f.geometry), { padding: 100 })
      }
      map.once('moveend', () => refreshVisibleCallouts?.(filters))
    } else if (search && cachedVias.value) {
      const searchNames = new Set(store.filteredStats.viasDetalle.map(v => v.nombre))
      const vias = cachedVias.value.features.filter(f => searchNames.has(f.properties.NOMBRE_VIA))
      if (vias.length) flyToGeometries(vias.map(f => f.geometry), { padding: 100 })
      map.once('moveend', () => refreshVisibleCallouts?.(filters))
    }
  }

  function _updateNoResults({ search, proyecto }) {
    if (!cachedVias.value) {
      noResults.value = false
      return
    }
    const hasTextFilter = !!(search || (proyecto && proyecto !== 'Todos los proyectos'))
    if (!hasTextFilter) {
      noResults.value = false
      return
    }
    if (proyecto && proyecto !== 'Todos los proyectos') {
      noResults.value = false // We assume if it's in the list, it exists
    } else {
      noResults.value = false 
    }
  }

  function applyFilters(filters) {
    const map = getMap()
    if (!map) return

    const sub = filters.subregion ?? ''
    const mpio = filters.municipio ?? ''
    const proyecto = filters.proyecto ?? ''
    const search = (filters.search ?? '').toLowerCase()
    
    _updateSelections(mpio, sub)

    const state = {
      sub, mpio, proyecto, search,
      hasSub: sub && sub !== 'Todas las subregiones',
      hasMpio: mpio && mpio !== 'Todos los municipios',
      hasCir: proyecto && proyecto !== 'Todos los proyectos',
    }
    state.hasAny = state.hasSub || state.hasMpio || state.hasCir || !!search

    _applyMpioStyle(map, state)
    _applyViasStyle(map, state)
    _handleFlightAndLabels(map, filters, state)
    _updateNoResults(state)
  }

  watch(
    [filtersRef, cachedMunicipios],
    ([filters, mun]) => {
      if (mun) {
        applyFilters(filters)
      }
    },
    { deep: true, immediate: true }
  )

  return { selectedSubregion, selectedMunicipio, noResults }
}
