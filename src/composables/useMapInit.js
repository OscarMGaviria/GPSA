import { ref, onMounted, onUnmounted } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export const CENTER  = [-75.5636, 7.150]
export const ZOOM    = 7
export const BASEMAPS = [
  {
    id: 'estandar', label: 'Estándar', color: '#a8c5a0',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    id: 'claro', label: 'Claro', color: '#e8e8e8',
    tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
  },
  {
    id: 'satelite', label: 'Satélite', color: '#3a5a3a',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: '© <a href="https://www.esri.com/">Esri</a>',
  },
  {
    id: 'oscuro', label: 'Oscuro', color: '#2d2d2d',
    tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
  },
  { id: 'ninguno', label: 'Ninguno', color: null, tiles: [], attribution: '' },
]

export function useMapInit(mapContainer, { onMapCreated, onLoad } = {}) {
  const activeBasemap = ref('ninguno')
  const switcherOpen  = ref(false)
  const terrainActive = ref(false)
  let _map       = null
  let resizeObs  = null
  let _prevBasemap = null

  const getMap = () => _map

  const toggleTerrain = () => {
    if (!_map) return
    terrainActive.value = !terrainActive.value
    if (terrainActive.value) {
      // Si el mapa base activo es 'ninguno', forzar el mapa base 'estandar' (OpenStreetMap)
      // para evitar artefactos visuales tridimensionales sobre fondo transparente.
      if (activeBasemap.value === 'ninguno') {
        _prevBasemap = 'ninguno'
        switchBasemap(BASEMAPS[0]) // BASEMAPS[0] es 'estandar'
      } else {
        _prevBasemap = null
      }

      _map.setTerrain({ source: 'terrainSource', exaggeration: 1.5 })
      
      // Activar cielo atmosférico (experimental en MapLibre GL v3+)
      if (typeof _map.setSky === 'function') {
        _map.setSky({
          'sky-color': '#199EF3',
          'sky-horizon-blend': 0.5,
          'horizon-color': '#f0f8ff',
          'horizon-fog-blend': 0.7,
          'fog-color': '#ffffff',
          'fog-ground-blend': 0.5
        })
      }

      // Cambiar el color de los municipios para la vista 3D (ej: un azul celeste tecnológico)
      if (_map.getLayer('municipios-fill')) {
        _map.setPaintProperty('municipios-fill', 'fill-color', [
          'case', ['==', ['get', '_hasVias'], 1], '#015a88', '#0284c7'
        ])
        _map.setPaintProperty('municipios-fill', 'fill-opacity', [
          'case', ['boolean', ['feature-state', 'hover'], false], 0.3, ['==', ['get', '_hasVias'], 1], 0.18, 0.1
        ])
      }
      if (_map.getLayer('municipios-outline')) {
        _map.setPaintProperty('municipios-outline', 'line-color', '#0284c7')
        _map.setPaintProperty('municipios-outline', 'line-width', 1.2)
      }

      if (!_map.getLayer('hillshade')) {
        const layers = _map.getStyle().layers || []
        const beforeId = layers.find(l => l.id !== 'base-layer')?.id
        _map.addLayer({
          id: 'hillshade', type: 'hillshade', source: 'hillshadeSource',
          layout: { visibility: 'visible' },
          paint: {
            'hillshade-shadow-color': '#473B24',
          },
        }, beforeId)
      }
      _map.easeTo({ pitch: 70, duration: 900 })
    } else {
      _map.setTerrain(null)
      if (typeof _map.setSky === 'function') {
        _map.setSky(undefined)
      }
      if (_map.getLayer('hillshade')) _map.removeLayer('hillshade')

      // Restaurar el color original de los municipios (verde #2d8653)
      if (_map.getLayer('municipios-fill')) {
        _map.setPaintProperty('municipios-fill', 'fill-color', [
          'case', ['==', ['get', '_hasVias'], 1], '#1a5c3a', '#2d8653'
        ])
        _map.setPaintProperty('municipios-fill', 'fill-opacity', [
          'case', ['boolean', ['feature-state', 'hover'], false], 0.22, ['==', ['get', '_hasVias'], 1], 0.14, 0.07
        ])
      }
      if (_map.getLayer('municipios-outline')) {
        _map.setPaintProperty('municipios-outline', 'line-color', '#2d8653')
        _map.setPaintProperty('municipios-outline', 'line-width', 0.8)
      }

      // Si se forzó el mapa base, restaurar 'ninguno' al apagar el relieve
      if (_prevBasemap === 'ninguno') {
        switchBasemap(BASEMAPS.find(b => b.id === 'ninguno'))
      }

      _map.easeTo({ pitch: 0, duration: 900 })
    }
  }

  const switchBasemap = (basemap) => {
    if (!_map || activeBasemap.value === basemap.id) return
    activeBasemap.value = basemap.id
    switcherOpen.value  = false
    if (basemap.id === 'ninguno') {
      if (_map.getLayer('base-layer')) _map.setLayoutProperty('base-layer', 'visibility', 'none')
    } else {
      if (_map.getLayer('base-layer')) _map.setLayoutProperty('base-layer', 'visibility', 'visible')
      const source = _map.getSource('base')
      if (source) source.setTiles(basemap.tiles)
    }
  }

  onMounted(() => {
    const initial = BASEMAPS[0]
    const isMobileDevice = globalThis.innerWidth <= 1024

    _map = new maplibregl.Map({
      container: mapContainer.value,
      style: {
        version: 8,
        sources: {
          base: { type: 'raster', tiles: initial.tiles, tileSize: 256, attribution: initial.attribution, maxzoom: 17 },
        },
        layers: [
          { id: 'base-layer', type: 'raster', source: 'base', minzoom: 0, layout: { visibility: 'none' } },
        ],
      },
      center: CENTER,
      zoom:   ZOOM,
      pitch:   0,
      bearing: 0,
      maxPitch: isMobileDevice ? 0 : 85,
      dragRotate: !isMobileDevice,
      pitchWithRotate: !isMobileDevice,
    })

    if (isMobileDevice) {
      _map.touchZoomRotate.disableRotation()
    }

    onMapCreated?.(_map)

    _map.addControl(new maplibregl.NavigationControl(), 'top-right')
    _map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    _map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right')

    resizeObs = new ResizeObserver(() => { _map?.resize() })
    resizeObs.observe(mapContainer.value)

    _map.on('load', async () => {
      _map.addSource('terrainSource', {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json'
      })
      _map.addSource('hillshadeSource', {
        type: 'raster-dem',
        url: 'https://tiles.mapterhorn.com/tilejson.json'
      })

      await onLoad?.()
    })
  })

  onUnmounted(() => {
    resizeObs?.disconnect()
    _map?.remove()
  })

  return { getMap, activeBasemap, switcherOpen, terrainActive, switchBasemap, toggleTerrain }
}
