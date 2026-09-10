import { ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import { useMapStore } from '../stores/useMapStore.js'

const normUp = s => (s ?? '').normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').toUpperCase()

function _getMpioFillColor(isTerrain) {
  if (isTerrain) {
    return ['literal', '#0284c7']
  }
  return ['literal', '#2d8653']
}

function _getMpioFillOpacity(isTerrain) {
  if (isTerrain) return ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0.1]
  return ['case', ['boolean', ['feature-state', 'hover'], false], 0.22, 0.07]
}

function _applyMpioStyle(map) {
  if (!map.getLayer('municipios-fill')) return
  const f = null
  map.setFilter('municipios-fill', f)
  map.setFilter('municipios-outline', f)
  if (map.getLayer('municipios-labels')) {
    map.setFilter('municipios-labels', f)
    map.setLayoutProperty('municipios-labels', 'visibility', 'none')
  }

  const isTerrain = !!map.getTerrain()
  map.setPaintProperty('municipios-fill', 'fill-color', _getMpioFillColor(isTerrain))
  map.setPaintProperty('municipios-fill', 'fill-opacity', _getMpioFillOpacity(isTerrain))
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

  function _applyViasStyle(map, { hasAny, hasCir, proyecto }) {
    if (!map.getLayer('vias-line')) return
    let viasFilter = null
    if (hasAny) {
      const expressions = ['all']
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

    // Filtrar también la capa de proyectos (gavino-localizacion) por nombre
    if (map.getLayer('gavino-localizacion-fill')) {
      if (hasCir && proyecto) {
        map.setFilter('gavino-localizacion-fill', ['==', ['get', 'NOMBRE_PROYECTO'], proyecto])
        if (map.getLayer('gavino-localizacion-outline')) {
          map.setFilter('gavino-localizacion-outline', ['==', ['get', 'NOMBRE_PROYECTO'], proyecto])
        }
      } else {
        map.setFilter('gavino-localizacion-fill', null)
        if (map.getLayer('gavino-localizacion-outline')) {
          map.setFilter('gavino-localizacion-outline', null)
        }
      }
    }

    // Filtrar capa de puntos de proyecto
    if (map.getLayer('proyecto-point-circle')) {
      if (hasCir && proyecto) {
        const proyectoFilter = ['==', ['get', 'nombre'], proyecto]
        map.setFilter('proyecto-point-circle', proyectoFilter)
        if (map.getLayer('proyecto-point-label')) map.setFilter('proyecto-point-label', proyectoFilter)
        if (map.getLayer('proyecto-point-pulse')) map.setFilter('proyecto-point-pulse', proyectoFilter)
      } else {
        map.setFilter('proyecto-point-circle', null)
        if (map.getLayer('proyecto-point-label')) map.setFilter('proyecto-point-label', null)
        if (map.getLayer('proyecto-point-pulse')) map.setFilter('proyecto-point-pulse', ['==', ['get', 'enEjecucion'], true])
      }
    }
  }

  function _resetFlight(map, filters) {
    refreshVisibleCallouts?.(filters)
    if (cachedMunicipios?.value) {
      flyToGeometries(cachedMunicipios.value.features.map(f => f.geometry), { padding: 40 })
    } else {
      map.flyTo({ center, zoom, duration: 400 })
    }
  }

  function _handleFlightAndLabels(map, filters, { hasAny, hasCir, search, proyecto }) {
    if (!hasAny) return _resetFlight(map, filters)
    if (!cachedMunicipios.value) return

    if (hasCir) {
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
        // Si todos los features son Points, usar flyTo con zoom fijo
        const allPoints = featsToFly.every(f => f.geometry.type === 'Point')
        if (allPoints) {
          const coords = featsToFly[0].geometry.coordinates
          map.flyTo({ center: [coords[0], coords[1]], zoom: 14, duration: 1500, essential: true })
        } else {
          flyToGeometries(featsToFly.map(f => f.geometry), { padding: 100 })
        }
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
    noResults.value = false 
  }

  function applyFilters(filters) {
    const map = getMap()
    if (!map) return

    const puente = filters.puente ?? ''
    const pap = filters.pap ?? ''
    const search = (filters.search ?? '').toLowerCase()
    const proyecto = (puente && puente !== 'Todos los puentes') ? puente :
                     (pap && pap !== 'Todos los PAP y otros') ? pap : ''

    const state = {
      proyecto, search,
      hasCir: !!proyecto
    }
    state.hasAny = state.hasCir || !!search

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
