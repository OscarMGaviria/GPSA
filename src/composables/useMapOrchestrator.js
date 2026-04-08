import maplibregl                   from 'maplibre-gl'
import { useCallouts }              from './useCallouts.js'
import { useMapLayers }             from './useMapLayers.js'
import { useMapFilters }            from './useMapFilters.js'
import { useMapInit, CENTER, ZOOM } from './useMapInit.js'
import { useMapStore }              from '../stores/useMapStore.js'
import { parseDescription, extractPhotosByPhase } from '../services/api.js'

export function useMapOrchestrator(mapContainer, filtersGetter) {
  const store = useMapStore()
  let _map = null

  const { visibleCallouts, buildCallouts, updateCalloutPositions, refreshVisibleCallouts }
    = useCallouts(() => _map)

  const { loading, loadError, fromCache, hoverLabel, selectedVia, cachedMunicipios, cachedVias, loadSimeva }
    = useMapLayers(
        () => _map,
        {
          onOptionsLoaded: (opts)  => store.setFilterOptions(opts),
          onStatsLoaded:   (stats) => { store.setMapStats(stats); store.setMapLoading(false) },
        },
        { buildCallouts, updateCalloutPositions },
      )

  const { selectedSubregion, selectedMunicipio, noResults }
    = useMapFilters(() => _map, filtersGetter, {
        cachedMunicipios, cachedVias,
        center: CENTER, zoom: ZOOM,
        refreshVisibleCallouts,
      })

  const { activeBasemap, switcherOpen, terrainActive, switchBasemap, toggleTerrain }
    = useMapInit(mapContainer, {
        onMapCreated: (m) => { _map = m },
        onLoad:       () => { store.setMapLoading(true); loadSimeva() },
      })

  function openVia(via) {
    if (!_map || !cachedVias.value) return
    const feat = cachedVias.value.features.find(f => f.properties.name === via.nombre)
    if (!feat) return
    const bounds = new maplibregl.LngLatBounds()
    function walk(c) { typeof c[0] === 'number' ? bounds.extend(c) : c.forEach(walk) }
    walk(feat.geometry.coordinates)
    if (!bounds.isEmpty()) _map.fitBounds(bounds, { padding: 80, duration: 900 })
    selectedVia.value = {
      name:        feat.properties.name ?? 'Vía',
      description: parseDescription(feat.properties.description ?? ''),
      photos:      extractPhotosByPhase(feat.properties, feat.properties.description ?? ''),
      geometry:    feat.geometry,
    }
  }

  return {
    activeBasemap, switcherOpen, terrainActive, switchBasemap, toggleTerrain,
    loading, loadError, fromCache, hoverLabel, loadSimeva,
    selectedVia,
    selectedSubregion, selectedMunicipio,
    visibleCallouts,
    noResults,
    openVia,
  }
}
