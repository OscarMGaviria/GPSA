import { ref, onMounted, onUnmounted } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export const CENTER  = [-75.5636, 6.2442]
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

  const getMap = () => _map

  const toggleTerrain = () => {
    if (!_map) return
    terrainActive.value = !terrainActive.value
    if (terrainActive.value) {
      _map.setTerrain({ source: 'terrain-dem', exaggeration: 2.5 })
      if (!_map.getLayer('hillshade')) {
        _map.addLayer({
          id: 'hillshade', type: 'hillshade', source: 'terrain-dem',
          paint: {
            'hillshade-exaggeration':           0.7,
            'hillshade-shadow-color':           '#1a2e1a',
            'hillshade-highlight-color':        '#f0f4f0',
            'hillshade-accent-color':           '#3a5c3a',
            'hillshade-illumination-direction': 315,
          },
        }, 'base-layer')
      }
      _map.easeTo({ pitch: 50, duration: 900 })
    } else {
      _map.setTerrain(null)
      if (_map.getLayer('hillshade')) _map.removeLayer('hillshade')
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

    _map = new maplibregl.Map({
      container: mapContainer.value,
      style: {
        version: 8,
        sources: {
          base: { type: 'raster', tiles: initial.tiles, tileSize: 256, attribution: initial.attribution },
        },
        layers: [
          { id: 'base-layer', type: 'raster', source: 'base', minzoom: 0, maxzoom: 19, layout: { visibility: 'none' } },
        ],
      },
      center: CENTER,
      zoom:   ZOOM,
      pitch:   0,
      bearing: 0,
    })

    onMapCreated?.(_map)

    _map.addControl(new maplibregl.NavigationControl(), 'top-right')
    _map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    _map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }), 'top-right')

    resizeObs = new ResizeObserver(() => { _map?.resize() })
    resizeObs.observe(mapContainer.value)

    _map.on('load', async () => {
      // DEM: AWS Terrarium — buena cobertura y resolución para los Andes
      _map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        encoding: 'terrarium',
        maxzoom: 15,
      })

      // Terrain y hillshade disponibles pero inactivos al inicio
      // El usuario los activa con el botón de relieve

      await onLoad?.()
    })
  })

  onUnmounted(() => {
    resizeObs?.disconnect()
    _map?.remove()
  })

  return { getMap, activeBasemap, switcherOpen, terrainActive, switchBasemap, toggleTerrain }
}
