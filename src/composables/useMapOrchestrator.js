import maplibregl                   from 'maplibre-gl'
import { useCallouts }              from './useCallouts.js'
import { useMapLayers }             from './useMapLayers.js'
import { useMapFilters }            from './useMapFilters.js'
import { useMapInit, CENTER, ZOOM } from './useMapInit.js'
import { useMapStore }              from '../stores/useMapStore.js'

export function useMapOrchestrator(mapContainer, filtersGetter) {
  const store = useMapStore()
  let _map = null

  const { visibleCallouts, buildCallouts, updateCalloutPositions, refreshVisibleCallouts }
    = useCallouts(() => _map)

  const { loading, loadError, fromCache, hoverLabel, viaHoverLabel, selectedVia, selectedMpio, cachedMunicipios, cachedVias, loadSimeva }
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
    const feat = cachedVias.value.features.find(f => f.properties.NOMBRE_VIA === via.nombre)
    if (!feat) return
    const bounds = new maplibregl.LngLatBounds()
    function walk(c) { typeof c[0] === 'number' ? bounds.extend(c) : c.forEach(walk) }
    walk(feat.geometry.coordinates)
    if (!bounds.isEmpty()) _map.fitBounds(bounds, { padding: 80, duration: 900 })
    const p = feat.properties
    selectedVia.value = {
      name:        p.NOMBRE_VIA ?? 'Vía',
      description: {
        Municipio:   p.MPIO_NOMBR ?? '',
        Subregión:   p.SUBREGION  ?? '',
        Circuito:    p.CIRCUITO   ?? '',
        Código:      p.CODIGO_VIA ?? '',
        Contratista: p.CONTRATIST ?? '',
        'Longitud (km)': parseFloat(p.long_km) || '',
        'Avance físico': p.Avance_Fis != null ? `${p.Avance_Fis}%` : '',
        'Plazo (meses)': p.PLAZO_MESE ?? '',
      },
      photos:   [],
      geometry: feat.geometry,
    }
  }

  return {
    activeBasemap, switcherOpen, terrainActive, switchBasemap, toggleTerrain,
    loading, loadError, fromCache, hoverLabel, viaHoverLabel, loadSimeva,
    selectedVia, selectedMpio,
    selectedSubregion, selectedMunicipio,
    noResults,
    openVia,
  }
}
