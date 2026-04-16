import { ref, onUnmounted } from 'vue'
import { getLocalizaciones, getMunicipios } from '../services/api.js'

function sentenceCase(str) {
  if (!str) return str
  const lower = str.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function capitalize(str) {
  if (!str) return str
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export function useMapLayers(getMap, { onOptionsLoaded, onStatsLoaded } = {}, { buildCallouts, updateCalloutPositions } = {}) {
  const loading          = ref(true)
  const loadError        = ref(false)
  const fromCache        = ref(false)
  const hoverLabel       = ref({ name: '', x: 0, y: 0, visible: false })
  const viaHoverLabel    = ref({ name: '', km: null, x: 0, y: 0, visible: false })
  const selectedVia      = ref(null)
  const selectedMpio     = ref(null)
  const cachedMunicipios = ref(null)
  const cachedVias       = ref(null)
  let destroyed = false

  onUnmounted(() => { destroyed = true })

  async function loadSimeva() {
    const map = getMap()
    if (!map || destroyed) return
    loading.value   = true
    loadError.value = false

    const [resMunicipios, resVias] = await Promise.allSettled([getMunicipios(), getLocalizaciones()])

    if (destroyed) return

    const munResult = resMunicipios.status === 'fulfilled' ? resMunicipios.value : null
    const viaResult = resVias.status       === 'fulfilled' ? resVias.value       : null

    cachedMunicipios.value = munResult?.data ?? null
    cachedVias.value       = viaResult?.data ?? null
    fromCache.value        = !!(munResult?.fromCache || viaResult?.fromCache)

    const geoMunicipios = cachedMunicipios.value
    const geoVias       = cachedVias.value

    if (resMunicipios.status === 'rejected') console.warn('[SIMEVA] Municipios:', resMunicipios.reason)
    if (resVias.status       === 'rejected') console.warn('[SIMEVA] Vías:', resVias.reason)

    if (!geoMunicipios && !geoVias) {
      loadError.value = true
      loading.value   = false
      return
    }

    // Normaliza texto para comparar sin acentos ni mayúsculas
    const norm = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

    const SUBREGIONES_FIJAS = [
      'Valle de aburrá', 'Oriente', 'Occidente', 'Norte',
      'Nordeste', 'Urabá', 'Bajo cauca', 'Magdalena medio', 'Suroeste',
    ]
    const subNorm = SUBREGIONES_FIJAS.map(norm)

    function canonicalSub(raw) {
      const idx = subNorm.indexOf(norm(sentenceCase(raw ?? '')))
      return idx !== -1 ? SUBREGIONES_FIJAS[idx] : sentenceCase(raw ?? '')
    }

    // ── Opciones para filtros ─────────────────────────────────────────────────
    const subregiones = geoMunicipios
      ? [...new Set(geoMunicipios.features.map(f => canonicalSub(f.properties.SUBREGION)).filter(Boolean))].sort()
      : []
    // Solo municipios que tienen vías en localizacion.geojson
    const municipioOpts = geoVias
      ? [...new Set(geoVias.features.map(f => sentenceCase(f.properties.MPIO_NOMBR)).filter(Boolean))].sort()
      : []
    const circuitos = geoVias
      ? [...new Set(geoVias.features.map(f => f.properties.CIRCUITO).filter(Boolean))].sort()
      : []

    // municipiosPorSubregion también solo con municipios que tienen vías
    const municipiosConVias = new Set(
      geoVias?.features.map(f => sentenceCase(f.properties.MPIO_NOMBR)).filter(Boolean) ?? []
    )
    const municipiosPorSubregion = {}
    if (geoMunicipios) {
      for (const f of geoMunicipios.features) {
        const sub  = canonicalSub(f.properties.SUBREGION)
        const mpio = sentenceCase(f.properties.MPIO_NOMBR)
        if (sub && mpio && municipiosConVias.has(mpio)) {
          if (!municipiosPorSubregion[sub]) municipiosPorSubregion[sub] = []
          if (!municipiosPorSubregion[sub].includes(mpio)) municipiosPorSubregion[sub].push(mpio)
        }
      }
      for (const k of Object.keys(municipiosPorSubregion)) municipiosPorSubregion[k].sort()
    }

    onOptionsLoaded?.({
      subregiones:           ['Todas las subregiones', ...subregiones],
      municipios:            ['Todos los municipios',  ...municipioOpts],
      circuitos:             ['Todos los circuitos',   ...circuitos],
      municipiosPorSubregion,
    })

    // ── Estadísticas desde propiedades directas del GeoJSON ──────────────────
    const viasDetalle = []
    let longitudTotal = 0
    const kmPorSubregion = {}

    if (geoVias) {
      for (const f of geoVias.features) {
        const p    = f.properties
        const km   = parseFloat(p.long_km) || 0
        const sub  = canonicalSub(p.SUBREGION) ?? 'Sin subregión'
        const mpio = sentenceCase(p.MPIO_NOMBR ?? '')

        longitudTotal += km
        if (km) kmPorSubregion[sub] = (kmPorSubregion[sub] ?? 0) + km

        viasDetalle.push({
          nombre:      p.NOMBRE_VIA ?? 'Sin nombre',
          codigo:      p.CODIGO_VIA ?? '',
          municipio:   mpio,
          subregion:   sub,
          km:          Math.round(km * 100) / 100,
          avance:      parseFloat(p.Avance_Fis) || 0,
          avanceFin:   parseFloat(p.Avance_Fin) || 0,
          contratista: p.CONTRATIST ?? '',
          contrato:    p.NO_CONTRAT ?? '',
          plazoMeses:  parseFloat(p.PLAZO_MESE) || 0,
          plazo:       p.PLAZO_MESE ? `${p.PLAZO_MESE} meses` : '',
          circuito:    p.CIRCUITO ?? '',
        })
      }
    }

    const totalKm = longitudTotal || 1
    const subregionesStats = SUBREGIONES_FIJAS.map(name => {
      const km = kmPorSubregion[name] ?? 0
      return { name, km: Math.round(km * 100) / 100, pct: Math.round((km / totalKm) * 100) }
    })

    const uniqueVias       = new Set(geoVias?.features.map(f => f.properties.NOMBRE_VIA).filter(Boolean)).size
    const uniqueMunicipios = new Set(geoVias?.features.map(f => f.properties.MPIO_NOMBR).filter(Boolean)).size
    const uniqueCircuitos  = new Set(geoVias?.features.map(f => f.properties.CIRCUITO).filter(Boolean)).size

    onStatsLoaded?.({
      viasIntervenidas: uniqueVias,
      longitudTotal:    Math.round(longitudTotal * 100) / 100,
      municipios:       uniqueMunicipios,
      circuitos:        uniqueCircuitos,
      subregiones:      subregionesStats,
      viasDetalle,
    })

    if (destroyed) return

    // ── Capa municipios ───────────────────────────────────────────────────────
    if (geoMunicipios) {
      try {
        map.addSource('municipios', { type: 'geojson', data: geoMunicipios, generateId: true })
        map.addLayer({
          id: 'municipios-fill',
          type: 'fill',
          source: 'municipios',
          paint: {
            'fill-color': '#2d8653',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.22, 0.07],
          },
        })
        map.addLayer({
          id: 'municipios-outline',
          type: 'line',
          source: 'municipios',
          paint: { 'line-color': '#2d8653', 'line-width': 0.8, 'line-opacity': 0.5 },
        })
        map.addLayer({
          id: 'municipios-labels',
          type: 'symbol',
          source: 'municipios',
          layout: {
            'text-field': ['get', 'MPIO_NOMBR'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 7, 9, 10, 13],
            'text-anchor': 'center',
            'text-max-width': 8,
            'text-allow-overlap': false,
            'visibility': 'none',
          },
          paint: {
            'text-color': '#0b5640',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        })

        let hoveredMpio = null
        map.on('mousemove', 'municipios-fill', (e) => {
          if (hoveredMpio !== null)
            map.setFeatureState({ source: 'municipios', id: hoveredMpio }, { hover: false })
          hoveredMpio = e.features[0].id
          map.setFeatureState({ source: 'municipios', id: hoveredMpio }, { hover: true })
        })
        map.on('mouseleave', 'municipios-fill', () => {
          if (hoveredMpio !== null)
            map.setFeatureState({ source: 'municipios', id: hoveredMpio }, { hover: false })
          hoveredMpio = null
        })

        map.on('click', 'municipios-fill', (e) => {
          const p = e.features[0].properties
          selectedMpio.value = {
            nombre:    sentenceCase(p.MPIO_NOMBR ?? ''),
            subregion: canonicalSub(p.SUBREGION),
          }
        })
      } catch (err) {
        console.error('[SIMEVA] Error cargando municipios:', err)
      }
    }

    // ── Capa vías ─────────────────────────────────────────────────────────────
    if (geoVias) {
      try {
        map.addSource('vias', { type: 'geojson', data: geoVias, generateId: true })

        // 1. Casing base (siempre visible)
        map.addLayer({
          id: 'vias-casing',
          type: 'line',
          source: 'vias',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.4 },
        })
        // 2. Halo blanco ampliado en hover
        map.addLayer({
          id: 'vias-hover-casing',
          type: 'line',
          source: 'vias',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          filter: ['==', ['get', 'NOMBRE_VIA'], ''],
          paint: { 'line-color': '#ffffff', 'line-width': 13, 'line-opacity': 0.55 },
        })
        // 3. Glow verde difuminado en hover
        map.addLayer({
          id: 'vias-glow',
          type: 'line',
          source: 'vias',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          filter: ['==', ['get', 'NOMBRE_VIA'], ''],
          paint: { 'line-color': '#4ade80', 'line-width': 16, 'line-opacity': 0.28, 'line-blur': 8 },
        })
        // 4. Línea principal (siempre visible)
        map.addLayer({
          id: 'vias-line',
          type: 'line',
          source: 'vias',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color':   ['coalesce', ['get', 'stroke'], '#ffaa00'],
            'line-width':   5,
            'line-opacity': 1,
          },
        })
        // 5. Highlight encima en hover (engrosamiento + brillo)
        map.addLayer({
          id: 'vias-hover-line',
          type: 'line',
          source: 'vias',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          filter: ['==', ['get', 'NOMBRE_VIA'], ''],
          paint: { 'line-color': '#ffffff', 'line-width': 7.5, 'line-opacity': 0.45 },
        })

        const HOVER_FILTER_ON  = (name) => ['==', ['get', 'NOMBRE_VIA'], name]
        const HOVER_FILTER_OFF = ['==', ['get', 'NOMBRE_VIA'], '']

        function startHover(nombreVia) {
          const f = HOVER_FILTER_ON(nombreVia)
          map.setFilter('vias-hover-casing', f)
          map.setFilter('vias-glow', f)
          map.setFilter('vias-hover-line', f)
        }

        function stopHover() {
          map.setFilter('vias-hover-casing', HOVER_FILTER_OFF)
          map.setFilter('vias-glow', HOVER_FILTER_OFF)
          map.setFilter('vias-hover-line', HOVER_FILTER_OFF)
        }

        // Mapa NOMBRE_VIA → { km, avance } para el tooltip
        const viaDataMap = {}
        for (const v of viasDetalle) viaDataMap[v.nombre] = { km: v.km, avance: v.avance }

        let hoveredVia = null

        map.on('click', 'vias-line', (e) => {
          const p    = e.features[0].properties
          const feat = cachedVias.value?.features.find(f => f.properties.NOMBRE_VIA === p.NOMBRE_VIA)
          selectedVia.value = {
            name:        p.NOMBRE_VIA ?? 'Vía',
            description: {
              Municipio:   sentenceCase(p.MPIO_NOMBR ?? ''),
              Subregión:   canonicalSub(p.SUBREGION),
              Circuito:    p.CIRCUITO ?? '',
              Código:      p.CODIGO_VIA ?? '',
              Contratista: p.CONTRATIST ?? '',
              'Longitud (km)': parseFloat(p.long_km) || '',
              'Avance físico': p.Avance_Fis != null ? `${p.Avance_Fis}%` : '',
              'Plazo (meses)': p.PLAZO_MESE ?? '',
            },
            photos:   [],
            geometry: feat?.geometry ?? null,
          }
        })

        map.on('mousemove', 'vias-line', (e) => {
          map.getCanvas().style.cursor = 'pointer'
          const name = e.features[0].properties.NOMBRE_VIA ?? ''
          if (name !== hoveredVia) {
            startHover(name)
            hoveredVia = name
          }
          const data = viaDataMap[name] ?? {}
          viaHoverLabel.value = { name, km: data.km ?? null, avance: data.avance ?? null, x: e.point.x, y: e.point.y, visible: true }
        })
        map.on('mouseleave', 'vias-line', () => {
          map.getCanvas().style.cursor = ''
          stopHover()
          hoveredVia = null
          viaHoverLabel.value = { ...viaHoverLabel.value, visible: false }
        })

        buildCallouts?.(geoVias.features)
        map.on('move',   updateCalloutPositions)
        map.on('resize', updateCalloutPositions)
      } catch (err) {
        console.error('[SIMEVA] Error cargando vías:', err)
      }
    }

    loading.value = false
  }

  return { loading, loadError, fromCache, hoverLabel, viaHoverLabel, selectedVia, selectedMpio, cachedMunicipios, cachedVias, loadSimeva }
}
