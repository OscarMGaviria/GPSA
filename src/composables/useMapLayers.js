import { ref, shallowRef, onUnmounted } from 'vue'
import { getLocalizaciones, getMunicipios, getPuenteGavinoLocalizacion, getPuenteGavinoPrediosAfectados, getPuenteGavinoPrediosConPermiso, parseDescription } from '../services/api.js'
import { pctTiempoTranscurrido } from '../utils/stats.js'
import { parseAvancePct } from '../utils/via.js'
import { useMapStore } from '../stores/useMapStore.js'
import hitosData from '../data/hitos.json'

const normStr = s => (s ?? '').toLowerCase().normalize('NFD').replaceAll(/[̀-ͯ]/g, '').trim()
const normUp  = s => (s ?? '').normalize('NFD').replaceAll(/[\u0300-\u036f]/g, '').toUpperCase().trim()
const _circuitosConSeguimiento = new Set(Object.keys(hitosData).map(normStr))

function sentenceCase(str) {
  if (!str) return str
  const lower = str.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

const SUBREGIONES_FIJAS = [
  'Valle de aburrá', 'Oriente', 'Occidente', 'Norte',
  'Nordeste', 'Urabá', 'Bajo cauca', 'Magdalena medio', 'Suroeste',
]
const subNorm = SUBREGIONES_FIJAS.map(normStr)

function canonicalSub(raw) {
  const idx = subNorm.indexOf(normStr(sentenceCase(raw ?? '')))
  return idx !== -1 ? SUBREGIONES_FIJAS[idx] : sentenceCase(raw ?? '')
}

function _getMunicipiosPorSubregion(geoMunicipios, geoVias) {
  if (!geoMunicipios) return {}
  const municipiosConVias = new Set(geoVias?.features.map(f => sentenceCase(f.properties.MPIO_NOMBR)).filter(Boolean) ?? [])
  const map = {}
  for (const f of geoMunicipios.features) {
    const sub = canonicalSub(f.properties.SUBREGION)
    const mpio = sentenceCase(f.properties.MPIO_NOMBR)
    if (sub && mpio && municipiosConVias.has(mpio)) {
      if (!map[sub]) map[sub] = []
      if (!map[sub].includes(mpio)) map[sub].push(mpio)
    }
  }
  for (const arr of Object.values(map)) arr.sort((a, b) => a.localeCompare(b, 'es'))
  return map
}

export function useMapLayers(getMap, { onOptionsLoaded, onStatsLoaded } = {}, { buildCallouts, updateCalloutPositions } = {}) {
  const store          = useMapStore()
  const loading          = ref(true)
  const loadError        = ref(false)
  const hoverLabel       = ref({ name: '', x: 0, y: 0, visible: false })
  const viaHoverLabel    = ref({ name: '', km: null, x: 0, y: 0, visible: false })
  const selectedVia      = ref(null)
  const selectedMpio     = ref(null)

  const cachedMunicipios = ref(null)
  const cachedVias       = ref(null)
  const cachedLocalizaciones = ref(null)
  const fromCache        = ref(false)

  let destroyed = false

  onUnmounted(() => { destroyed = true })



  function _extractFilterOptions(geoMunicipios, geoVias, geoLoc) {
    const subregiones = geoMunicipios
      ? [...new Set(geoMunicipios.features.map(f => canonicalSub(f.properties.SUBREGION)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
      : []
    const municipioOpts = geoVias
      ? [...new Set(geoVias.features.map(f => sentenceCase(f.properties.MPIO_NOMBR)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
      : []
    const proyectoOpts = geoLoc
      ? [...new Set(geoLoc.features.map(f => f.properties.NOMBRE_PROYECTO).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
      : []
    
    onOptionsLoaded?.({
      subregiones: ['Todas las subregiones', ...subregiones],
      municipios: ['Todos los municipios', ...municipioOpts],
      proyectos: ['Todos los proyectos', ...proyectoOpts],
      municipiosPorSubregion: _getMunicipiosPorSubregion(geoMunicipios, geoVias),
    })
  }

  function _calculateViasStats(geoVias, geoLoc) {
    const viasDetalle = []
    let longitudTotal = 0
    const kmPorSubregion = {}

    if (geoLoc) {
      for (const f of geoLoc.features) {
        const p = f.properties
        const nombre = p.NOMBRE_PROYECTO ?? 'Sin nombre'
        const sub = canonicalSub(p.SUBREGION) ?? 'Sin subregión'

        viasDetalle.push({
          nombre: nombre,
          subregion: sub,
          municipio: '',
          proyecto: nombre,
          km: 0,
          avance: 0,
          avanceFin: 0,
          estabilizado: 0,
          contratista: '',
          contrato: '',
          interventor: '',
          plazoMeses: 0,
          plazo: '',
          circuito: '',
          fechaIni: '',
        })
      }
    }

    const totalKm = longitudTotal || 1
    const subregionesStats = SUBREGIONES_FIJAS.map(name => {
      const km = kmPorSubregion[name] ?? 0
      return { name, km: Math.round(km * 100) / 100, pct: Math.round((km / totalKm) * 100) }
    })

    const uniqueVias = new Set(geoLoc?.features.map(f => f.properties.NOMBRE_PROYECTO).filter(Boolean)).size
    const uniqueMunicipios = new Set(geoVias?.features.map(f => f.properties.MPIO_NOMBR).filter(Boolean)).size

    onStatsLoaded?.({
      viasIntervenidas: uniqueVias,
      longitudTotal: 0,
      municipios: uniqueMunicipios,
      proyectos: uniqueVias,
      subregiones: subregionesStats,
      viasDetalle,
    })
  }

  function _setupMunicipiosLayer(map, geoMunicipios, geoVias) {
    try {
      const municipiosConViasNorm = new Set(
        geoVias?.features.map(f => normUp(f.properties.MPIO_NOMBR)).filter(Boolean) ?? []
      )
      const geoMunicipiosTagged = {
        ...geoMunicipios,
        features: geoMunicipios.features.map(f => {
          const mpioNormName = normUp(f.properties.MPIO_NOMBR)
          const hasVias = municipiosConViasNorm.has(mpioNormName) ? 1 : 0
          return {
            ...f,
            properties: {
              ...f.properties,
              _subregionNorm: normUp(f.properties.SUBREGION),
              _mpioNorm: mpioNormName,
              _hasVias: hasVias,
            },
          }
        }),
      }
      map.addSource('municipios', { type: 'geojson', data: geoMunicipiosTagged, generateId: true })
      const isTerrain = !!map.getTerrain()
      map.addLayer({
        id: 'municipios-fill',
        type: 'fill',
        source: 'municipios',
        paint: {
          'fill-color': isTerrain ? '#0284c7' : '#2d8653',
          'fill-opacity': isTerrain
            ? ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0.1]
            : ['case', ['boolean', ['feature-state', 'hover'], false], 0.22, 0.07],
        },
      })
      map.addLayer({
        id: 'municipios-outline',
        type: 'line',
        source: 'municipios',
        paint: {
          'line-color': isTerrain ? '#0284c7' : '#2d8653',
          'line-width': isTerrain ? 1.2 : 0.8,
          'line-opacity': 0.5
        },
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
        // Ignorar el hover de municipio si hay una capa de predio/localización encima
        const topFeatures = map.queryRenderedFeatures(e.point, {
          layers: ['gavino-localizacion-fill', 'gavino-afectados-fill', 'gavino-permiso-fill'].filter(l => map.getLayer(l))
        })
        if (topFeatures.length > 0) {
          if (hoveredMpio !== null) {
            map.setFeatureState({ source: 'municipios', id: hoveredMpio }, { hover: false })
            hoveredMpio = null
            hoverLabel.value = { ...hoverLabel.value, visible: false }
          }
          return
        }

        if (hoveredMpio !== null)
          map.setFeatureState({ source: 'municipios', id: hoveredMpio }, { hover: false })
        hoveredMpio = e.features[0].id
        map.setFeatureState({ source: 'municipios', id: hoveredMpio }, { hover: true })

        const p = e.features[0].properties
        hoverLabel.value = {
          name: sentenceCase(p.MPIO_NOMBR ?? ''),
          subtext: sentenceCase(p.SUBREGION ?? ''),
          x: e.point.x,
          y: e.point.y,
          visible: true
        }
      })
      map.on('mouseleave', 'municipios-fill', () => {
        if (hoveredMpio !== null)
          map.setFeatureState({ source: 'municipios', id: hoveredMpio }, { hover: false })
        hoveredMpio = null
        hoverLabel.value = { ...hoverLabel.value, visible: false }
      })

    } catch (err) {
      console.error('[SIMEVA] Error cargando municipios:', err)
    }
  }

  function _setupViasLayer(map, geoVias) {
    try {
      const geoViasTagged = {
        ...geoVias,
        features: geoVias.features.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            _hasReport: _circuitosConSeguimiento.has(normStr(f.properties.CIRCUITO ?? '')) ? 1 : 0,
            _subregionNorm: normUp(f.properties.SUBREGION),
            _mpioNorm: normUp(f.properties.MPIO_NOMBR),
          },
        })),
      }
      map.addSource('vias', {
        type: 'geojson',
        data: geoViasTagged,
        generateId: true,
        tolerance: 1.25 // Tolerancia de simplificación (Douglas-Peucker) para enderezar tramos en zoom alejado y dar detalle al acercarse
      })

      // 1. Casing base (siempre visible)
      map.addLayer({
        id: 'vias-casing',
        type: 'line',
        source: 'vias',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.4 },
      })
      // 2. Halo negro ampliado en hover (ancho 13.6px, opacidad 0.18)
      map.addLayer({
        id: 'vias-hover-casing',
        type: 'line',
        source: 'vias',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        filter: ['==', ['get', 'NOMBRE_VIA'], ''],
        paint: {
          'line-color': '#000000',
          'line-width': 13.6,
          'line-opacity': 0.18
        },
      })
      // 3. Contorno interno negro en hover (ancho 8.5px, opacidad 0.45)
      map.addLayer({
        id: 'vias-hover-inner-casing',
        type: 'line',
        source: 'vias',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        filter: ['==', ['get', 'NOMBRE_VIA'], ''],
        paint: {
          'line-color': '#000000',
          'line-width': 8.5,
          'line-opacity': 0.45
        },
      })
      // (Glow removido a petición del usuario para evitar efectos difuminados de tipo brillo/neon)
      // 4. Línea principal (siempre visible)
      map.addLayer({
        id: 'vias-line',
        type: 'line',
        source: 'vias',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ffaa00',
          'line-width':   4.25,
          'line-opacity': 1,
        },
      })
      // (Highlight blanco superior removido a petición del usuario para evitar el uso del color blanco)

      // 6. Hit target (invisible but thick) to capture hover/click easily
      map.addLayer({
        id: 'vias-hit-target',
        type: 'line',
        source: 'vias',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#000000', 'line-width': 24, 'line-opacity': 0 },
      })

      const HOVER_FILTER_ON  = (circuito) => {
        const expressions = ['all', ['==', ['get', 'CIRCUITO'], circuito]]
        const sub = store.activeFilters.subregion
        const mpio = store.activeFilters.municipio
        if (sub && sub !== 'Todas las subregiones') {
          expressions.push(['==', ['get', '_subregionNorm'], normUp(sub)])
        }
        if (mpio && mpio !== 'Todos los municipios') {
          expressions.push(['==', ['get', '_mpioNorm'], normUp(mpio)])
        }
        return expressions
      }
      const HOVER_FILTER_OFF = ['==', ['get', 'CIRCUITO'], '']

      function startHover(nombreVia) {
        const f = HOVER_FILTER_ON(nombreVia)
        map.setFilter('vias-hover-casing', f)
        map.setFilter('vias-hover-inner-casing', f)
      }

      function stopHover() {
        map.setFilter('vias-hover-casing', HOVER_FILTER_OFF)
        map.setFilter('vias-hover-inner-casing', HOVER_FILTER_OFF)
      }

      // Mapa CIRCUITO + SUBREGION → { km, avance } agregado para el tooltip/click
      const circuitDataMap = {}
      for (const f of geoVias.features) {
        const circ = f.properties.CIRCUITO ?? ''
        const sub  = f.properties.SUBREGION ?? ''
        const key  = circ + '||' + sub
        if (!circuitDataMap[key]) circuitDataMap[key] = { km: 0, avanceKm: 0 }
        const km = Number.parseFloat(f.properties.Long_km) || 0
        circuitDataMap[key].km      += km
        const fisDec = (Number.parseFloat(f.properties.AV_FISICO) || 0) > 1 ? (Number.parseFloat(f.properties.AV_FISICO) || 0) / 100 : (Number.parseFloat(f.properties.AV_FISICO) || 0)
        circuitDataMap[key].avanceKm += fisDec * km
      }
      for (const c of Object.values(circuitDataMap)) {
        c.avance = c.km > 0 ? Math.round((c.avanceKm / c.km) * 100) : 0
        c.km     = Math.round(c.km * 100) / 100
      }

      let hoveredVia = null

      function handleViaClick(e) {
        const p        = e.features[0].properties
        const circuito = p.CIRCUITO ?? ''
        const subregion = p.SUBREGION ?? ''
        const key      = circuito + '||' + subregion
        const circuitFeats = cachedVias.value?.features.filter(f => f.properties.CIRCUITO === circuito && f.properties.SUBREGION === subregion) ?? []
        const first    = circuitFeats[0]?.properties ?? p
        const municipios = [...new Set(circuitFeats.map(f => sentenceCase(f.properties.MPIO_NOMBR)).filter(Boolean))]
        const data     = circuitDataMap[key] ?? {}

        selectedMpio.value = null
        selectedVia.value = {
          name: circuito || 'Circuito sin nombre',
          idCircuito:  first['id-circuito'] ?? first.CIRCUITO ?? '',
          subregion: subregion,
          description: {
            circuitId:               first['id-circuito'] ?? first.CIRCUITO ?? '',
            Subregión:               canonicalSub(first.SUBREGION),
            Municipio:               municipios.join(', '),
            Circuito:                circuito,
            Contrato:                first.CTO        ?? '',
            Contratista:             first.CONTRATIST ?? '',
            Interventoría:           first.INTERV     ?? '',
            'Longitud (km)':         data.km ?? '',
            'Avance físico':         `${data.avance ?? 0}%`,
            'Fecha de inicio':       first.FECHA_INI  ?? '',
            'Plazo (meses)':         first.PLAZO_MESE ?? '',
            'Duración transcurrida': first.FECHA_INI && first.PLAZO_MESE
              ? `${pctTiempoTranscurrido(first.FECHA_INI, first.PLAZO_MESE)}%` : '',
          },
        }
      }

      function handleViaMouseMove(e) {
        map.getCanvas().style.cursor = 'pointer'
        const p = e.features[0].properties
        const circuito = p.CIRCUITO ?? ''
        const subregion = p.SUBREGION ?? ''
        const key = circuito + '||' + subregion
        if (circuito !== hoveredVia) {
          startHover(circuito)
          hoveredVia = circuito
        }
        const data = circuitDataMap[key] ?? {}
        viaHoverLabel.value = { name: circuito, km: data.km ?? null, avance: data.avance ?? null, x: e.point.x, y: e.point.y, visible: true }
      }

      function handleViaMouseLeave() {
        map.getCanvas().style.cursor = ''
        stopHover()
        hoveredVia = null
        viaHoverLabel.value = { ...viaHoverLabel.value, visible: false }
      }

      map.on('click', 'vias-hit-target', handleViaClick)
      map.on('mousemove', 'vias-hit-target', handleViaMouseMove)
      map.on('mouseleave', 'vias-hit-target', handleViaMouseLeave)

      buildCallouts?.(geoVias.features)
      map.on('move',   updateCalloutPositions)
      map.on('resize', updateCalloutPositions)
    } catch (err) {
      console.error('[SIMEVA] Error cargando vías:', err)
    }
  }

  function _setupGenericPolygonLayer(map, id, geoData, fillColor, outlineColor) {
    try {
      map.addSource(id, {
        type: 'geojson',
        data: geoData,
        generateId: true,
        tolerance: 0
      })
      map.addLayer({
        id: `${id}-fill`,
        type: 'fill',
        source: id,
        paint: {
          'fill-color': fillColor,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.7,
            0.4
          ]
        }
      })
      map.addLayer({
        id: `${id}-outline`,
        type: 'line',
        source: id,
        paint: {
          'line-color': outlineColor,
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            4,
            2
          ]
        }
      })
      
      if (id.includes('afectados')) {
        map.addLayer({
          id: `${id}-label`,
          type: 'symbol',
          source: id,
          layout: {
            'text-field': ['get', 'LABEL_ID'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-anchor': 'center'
          },
          paint: {
            'text-color': '#000000',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2
          }
        })
      }
      
      let hoveredPolygon = null
      map.on('mousemove', `${id}-fill`, (e) => {
        if (e.features.length > 0) {
          if (hoveredPolygon !== null) {
            map.setFeatureState({ source: id, id: hoveredPolygon }, { hover: false })
          }
          hoveredPolygon = e.features[0].id
          map.setFeatureState({ source: id, id: hoveredPolygon }, { hover: true })
        }
      })
      map.on('mouseleave', `${id}-fill`, () => {
        if (hoveredPolygon !== null) {
          map.setFeatureState({ source: id, id: hoveredPolygon }, { hover: false })
        }
        hoveredPolygon = null
      })

    } catch (err) {
      console.error(`[SIMEVA] Error cargando ${id}:`, err)
    }
  }

  function _getCentroid(coords) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const process = (c) => {
      if (typeof c[0] === 'number') {
        if (c[0] < minX) minX = c[0];
        if (c[0] > maxX) maxX = c[0];
        if (c[1] < minY) minY = c[1];
        if (c[1] > maxY) maxY = c[1];
      } else {
        c.forEach(process);
      }
    };
    process(coords);
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  }

  function _setupProyectoPoint(map, geoLoc) {
    if (!geoLoc || !geoLoc.features || !geoLoc.features.length) return;
    
    const pointFeatures = geoLoc.features.map(f => {
      const centroid = _getCentroid(f.geometry.coordinates);
      const desc = parseDescription(f.properties.description);
      const pct = parseAvancePct(desc);
      const enEjecucion = pct > 0 && pct < 100;
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: centroid },
        properties: { 
          nombre: f.properties.NOMBRE_PROYECTO || 'Proyecto',
          enEjecucion
        }
      }
    });

    try {
      map.addSource('proyecto-point', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: pointFeatures
        }
      })

      map.addLayer({
        id: 'proyecto-point-pulse',
        type: 'circle',
        source: 'proyecto-point',
        filter: ['==', ['get', 'enEjecucion'], true],
        maxzoom: 13,
        paint: {
          'circle-radius': 7,
          'circle-color': '#22c55e',
          'circle-opacity': 0.8,
          'circle-stroke-width': 0
        }
      })

      map.addLayer({
        id: 'proyecto-point-circle',
        type: 'circle',
        source: 'proyecto-point',
        maxzoom: 13,
        paint: {
          'circle-radius': 7,
          'circle-color': '#22c55e',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })

      map.addLayer({
        id: 'proyecto-point-label',
        type: 'symbol',
        source: 'proyecto-point',
        maxzoom: 13,
        layout: {
          'text-field': ['get', 'nombre'],
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-size': 12,
          'text-font': ['Prompt Bold', 'Open Sans Bold', 'Arial Unicode MS Bold']
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#0b5640',
          'text-halo-width': 2
        }
      })

      let hovered = null
      const pointLayers = ['proyecto-point-pulse', 'proyecto-point-circle', 'proyecto-point-label']
      
      map.on('mousemove', pointLayers, () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', pointLayers, () => { map.getCanvas().style.cursor = '' })
      
      map.on('click', pointLayers, (e) => {
        if (!e.features || !e.features.length) return
        const coords = e.features[0].geometry.coordinates
        map.flyTo({
          center: coords,
          zoom: 16,
          duration: 400,
          essential: true
        })
      })

      function animateMarker(timestamp) {
        if (destroyed || !map.getLayer('proyecto-point-pulse')) return;
        const duration = 2000;
        const t = (timestamp % duration) / duration;
        
        const radius = 7 + (15 * t);
        const opacity = Math.max(0, 0.8 - (0.8 * t));
        
        map.setPaintProperty('proyecto-point-pulse', 'circle-radius', radius);
        map.setPaintProperty('proyecto-point-pulse', 'circle-opacity', opacity);
        
        requestAnimationFrame(animateMarker);
      }
      requestAnimationFrame(animateMarker);

    } catch (err) {
      console.error('[SIMEVA] Error cargando proyecto point:', err)
    }
  }

  async function loadSimeva() {
    const map = getMap()
    if (!map || destroyed) return
    loading.value   = true
    loadError.value = false

    const [resMunicipios, resVias, resLoc, resAfectados, resPermiso] = await Promise.allSettled([
      getMunicipios(), 
      getLocalizaciones(), 
      getPuenteGavinoLocalizacion(),
      getPuenteGavinoPrediosAfectados(),
      getPuenteGavinoPrediosConPermiso()
    ])

    if (destroyed) return

    const munResult = resMunicipios.status === 'fulfilled' ? resMunicipios.value : null
    const viaResult = resVias.status       === 'fulfilled' ? resVias.value       : null
    const locResult = resLoc.status === 'fulfilled' ? resLoc.value : null
    const afecResult = resAfectados.status === 'fulfilled' ? resAfectados.value : null
    const perResult = resPermiso.status === 'fulfilled' ? resPermiso.value : null

    cachedMunicipios.value = munResult?.data ?? null
    cachedVias.value       = viaResult?.data ?? null
    cachedLocalizaciones.value = locResult?.data ?? null
    fromCache.value        = !!(munResult?.fromCache || viaResult?.fromCache)

    const geoMunicipios = cachedMunicipios.value
    const geoVias       = cachedVias.value
    const geoLoc = cachedLocalizaciones.value
    const geoAfectados = afecResult?.data ?? null
    const geoPermiso = perResult?.data ?? null

    if (resMunicipios.status === 'rejected') console.warn('[SIMEVA] Municipios:', resMunicipios.reason)
    if (resVias.status       === 'rejected') console.warn('[SIMEVA] Vías:', resVias.reason)

    if (!geoMunicipios && !geoVias && !geoLoc && !geoAfectados && !geoPermiso) {
      loadError.value = true
      loading.value   = false
      return
    }

    // Normaliza texto para comparar sin acentos ni mayúsculas

    _extractFilterOptions(geoMunicipios, geoVias, geoLoc)

    // ── Estadísticas desde propiedades directas del GeoJSON ──────────────────
    _calculateViasStats(geoVias, geoLoc)

    if (destroyed) return

    // ── Capa municipios ───────────────────────────────────────────────────────
    if (geoMunicipios) {
      _setupMunicipiosLayer(map, geoMunicipios, geoVias)
    }

    // ── Capas Puente Gavino ───────────────────────────────────────────────────
    if (geoAfectados) {
      _setupGenericPolygonLayer(map, 'gavino-afectados', geoAfectados, '#ef4444', '#dc2626')
      
      map.on('click', 'gavino-afectados-fill', (e) => {
        const p = e.features[0].properties
        selectedVia.value = {
          name: 'Predio Afectado',
          description: {
            'Local ID': p.LOCAL_ID || 'N/A',
            'Círculo y Matrícula': p.CIRCULO_MA || 'N/A',
            'Código de Terreno': p.TERRENO_CO || 'N/A',
          }
        }
      })
      
      map.on('mouseenter', 'gavino-afectados-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'gavino-afectados-fill', () => {
        map.getCanvas().style.cursor = ''
      })
    }
    if (geoPermiso) {
      _setupGenericPolygonLayer(map, 'gavino-permiso', geoPermiso, '#22c55e', '#16a34a')
      
      map.on('click', 'gavino-permiso-fill', (e) => {
        const p = e.features[0].properties
        selectedVia.value = {
          name: 'Predio con Permiso',
          description: {
            'Área': p.SHAPE_AREA ? Number(p.SHAPE_AREA).toFixed(2) + ' m²' : 'N/A',
            'Departamento': p.DPTO || 'N/A',
            'Municipio': p.MPIO || 'N/A',
            'Propietario': p.PROP || 'N/A',
            'Código Catastral': p.CODCATAS || 'N/A',
            'Matrícula Inmob.': p.MAT_INMOBILIARIA || 'N/A',
            ...(p.AREA_REQUERIDA ? { 'Área Requerida': p.AREA_REQUERIDA } : {}),
            ...(p.AREA ? { 'Área': p.AREA } : {})
          }
        }
      })
      
      map.on('mouseenter', 'gavino-permiso-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'gavino-permiso-fill', () => {
        map.getCanvas().style.cursor = ''
      })
    }
    if (geoLoc) {
      _setupGenericPolygonLayer(map, 'gavino-localizacion', geoLoc, '#3b82f6', '#2563eb')
      
      map.on('click', 'gavino-localizacion-fill', (e) => {
        const p = e.features[0].properties
        selectedVia.value = {
          name: 'Información del Proyecto',
          description: {
            'Proyecto': p.NOMBRE_PROYECTO || 'N/A',
            'Subregión': p.SUBREGION || 'N/A'
          }
        }
      })
      
      map.on('mouseenter', 'gavino-localizacion-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'gavino-localizacion-fill', () => {
        map.getCanvas().style.cursor = ''
      })
    }

    function _setupArcGISRedVial(map) {
      const baseUrl = 'https://services5.arcgis.com/K90UQIB09TmTjUL8/arcgis/rest/services/R10/FeatureServer'
      const layersConfig = [
        { id: '1', name: 'red-vial-primaria', color: '#ef4444', baseWidth: 1.5, maxWidth: 4, opacity: 0.4, visibility: 'visible' },
        { id: '2', name: 'red-vial-secundaria', color: '#f97316', baseWidth: 0.8, maxWidth: 2.5, opacity: 0.35, visibility: 'visible' },
        { id: '3', name: 'red-vial-terciaria', color: '#fbbf24', baseWidth: 0.5, maxWidth: 1.5, opacity: 0.3, visibility: 'none' }
      ]

      layersConfig.forEach(config => {
        const sourceId = `arcgis-${config.name}-source`
        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: `${baseUrl}/${config.id}/query?where=1%3D1&outFields=*&f=geojson`
          })
        }
        
        if (!map.getLayer(config.name)) {
          map.addLayer({
            id: config.name,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
              'visibility': config.visibility
            },
            paint: {
              'line-color': config.color,
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                6, config.baseWidth,
                15, config.maxWidth
              ],
              'line-opacity': config.opacity
            }
          }, 'proyecto-point-pulse') // Insertamos la capa de vías DEBAJO de los puntos (proyecto-point-pulse) para que no los tapen
        }
      })
    }

    _setupProyectoPoint(map, geoLoc)
    _setupArcGISRedVial(map)

    loading.value = false
  }

  return { loading, loadError, fromCache, hoverLabel, viaHoverLabel, selectedVia, selectedMpio, cachedMunicipios, cachedVias, cachedLocalizaciones, loadSimeva }
}
