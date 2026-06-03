import maplibregl                   from 'maplibre-gl'
import { useCallouts }              from './useCallouts.js'
import { useMapLayers }             from './useMapLayers.js'
import { useMapFilters }            from './useMapFilters.js'
import { useMapInit, CENTER, ZOOM } from './useMapInit.js'
import { useMapStore }              from '../stores/useMapStore.js'
import { pctTiempoTranscurrido }    from '../utils/stats.js'

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

  function _circuitFeats(nombre) {
    const circuito = cachedVias.value.features.find(f => f.properties.NOMBRE_VIA === nombre)?.properties.CIRCUITO ?? ''
    return { circuito, feats: cachedVias.value.features.filter(f => f.properties.CIRCUITO === circuito) }
  }

  function _fitCircuit(feats) {
    const bounds = new maplibregl.LngLatBounds()
    function walk(c) { typeof c[0] === 'number' ? bounds.extend(c) : c.forEach(walk) }
    for (const feat of feats) walk(feat.geometry.coordinates)
    if (!bounds.isEmpty()) _map.fitBounds(bounds, { padding: 80, duration: 900 })
  }

  function openVia(via) {
    if (!_map || !cachedVias.value) return
    const { circuito, feats } = _circuitFeats(via.nombre)
    if (!feats.length) return
    _fitCircuit(feats)
    const first = feats[0].properties
    const sentenceCase = s => s ? s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : ''
    const municipios = [...new Set(feats.map(f => sentenceCase(f.properties.MPIO_NOMBR ?? '')).filter(Boolean))]
    const totalKm = feats.reduce((s, f) => s + (parseFloat(f.properties.Long_km) || 0), 0)
    const avanceFisico = totalKm > 0
      ? feats.reduce((s, f) => s + (parseFloat(f.properties.AV_FISICO) || 0) * (parseFloat(f.properties.Long_km) || 0), 0) / totalKm
      : 0
    selectedVia.value = {
      name: circuito || 'Circuito sin nombre',
      description: {
        circuitId:               first.circuitId ?? '',
        Subregión:               first.SUBREGION  ?? '',
        Municipio:               municipios.join(', '),
        Circuito:                circuito,
        Contrato:                first.CTO        ?? '',
        Contratista:             first.CONTRATIST ?? '',
        Interventoría:           first.INTERV     ?? '',
        'Longitud (km)':         Math.round(totalKm * 100) / 100,
        'Avance físico':         `${Math.round(avanceFisico * 100)}%`,
        'Fecha de inicio':       first.FECHA_INI  ?? '',
        'Plazo (meses)':         first.PLAZO_MESE ?? '',
        'Duración transcurrida': first.FECHA_INI && first.PLAZO_MESE
          ? `${pctTiempoTranscurrido(first.FECHA_INI, first.PLAZO_MESE)}%` : '',
      },
    }
  }

  function flyToVia(via) {
    if (!_map || !cachedVias.value) return
    const { feats } = _circuitFeats(via.nombre)
    if (feats.length) _fitCircuit(feats)
  }

  let _coordMarker = null

  function flyToCoords(lat, lng) {
    if (!_map) return
    _map.flyTo({ center: [lng, lat], zoom: 15, duration: 900, essential: true })
    if (_coordMarker) _coordMarker.remove()
    _coordMarker = new maplibregl.Marker({ color: '#ef4444' })
      .setLngLat([lng, lat])
      .addTo(_map)
    setTimeout(() => { if (_coordMarker) { _coordMarker.remove(); _coordMarker = null } }, 8000)
  }

  return {
    activeBasemap, switcherOpen, terrainActive, switchBasemap, toggleTerrain,
    loading, loadError, fromCache, hoverLabel, viaHoverLabel, loadSimeva,
    selectedVia, selectedMpio,
    selectedSubregion, selectedMunicipio,
    noResults,
    openVia,
    flyToVia,
    flyToCoords,
  }
}
