import { ref, onUnmounted } from 'vue'
import { getLocalizaciones, getMunicipios, parseDescription, extractPhotosByPhase, extractKm, calcGeomKm } from '../services/api.js'

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
  const selectedVia      = ref(null)
  const cachedMunicipios = ref(null)
  const cachedVias       = ref(null)
  let destroyed = false

  onUnmounted(() => {
    destroyed = true
    popup?.remove()
  })

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
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

    // Municipios que tienen al menos una vía registrada
    const mpioNormSet = new Set()
    if (geoVias) {
      for (const f of geoVias.features) {
        const desc    = parseDescription(f.properties.description ?? '')
        const mpioKey = Object.keys(desc).find(k => /municipio/i.test(k))
        if (mpioKey) {
          const mpio = String(desc[mpioKey]).trim()
          if (mpio) mpioNormSet.add(norm(mpio))
        }
      }
    }

    // ── Emitir opciones para filtros ──────────────────────────────────────────
    const subregiones = geoMunicipios
      ? [...new Set(geoMunicipios.features.map(f => sentenceCase(f.properties.subregion)).filter(Boolean))].sort()
      : []
    const municipioOpts = geoMunicipios
      ? [...new Set(geoMunicipios.features.map(f => sentenceCase(f.properties.mpio_nombr)).filter(Boolean))]
          .filter(m => mpioNormSet.has(norm(m)))
          .sort()
      : []
    const circuitos = geoVias
      ? geoVias.features.map(f => f.properties.name).filter(Boolean).sort()
      : []

    const municipiosPorSubregion = {}
    if (geoMunicipios) {
      for (const f of geoMunicipios.features) {
        const sub  = sentenceCase(f.properties.subregion)
        const mpio = sentenceCase(f.properties.mpio_nombr)
        if (sub && mpio && mpioNormSet.has(norm(mpio))) {
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

    // ── Emitir estadísticas ───────────────────────────────────────────────────
    const totalCircuitos   = geoVias?.features.length ?? 0
    const uniqueMunicipios = geoMunicipios
      ? new Set(geoMunicipios.features.map(f => f.properties.mpio_nombr)).size : 0

    const SUBREGIONES_FIJAS = [
      'Valle de aburrá', 'Oriente', 'Occidente', 'Norte',
      'Nordeste', 'Urabá', 'Bajo cauca', 'Magdalena medio', 'Suroeste',
    ]

    // Lookup municipio → subregión desde geoMunicipios
    const municipioToSub = {}
    if (geoMunicipios) {
      for (const f of geoMunicipios.features) {
        const mpio = f.properties.mpio_nombr
        const sub  = f.properties.subregion
        if (mpio && sub) municipioToSub[norm(mpio)] = sentenceCase(sub)
      }
    }

    // Mapa normalizado de subregiones fijas para match robusto
    const subNorm = SUBREGIONES_FIJAS.map(norm)

    // ── Helpers espaciales ────────────────────────────────────────────────────
    function pointInRing(pt, ring) {
      let inside = false
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j]
        if ((yi > pt[1]) !== (yj > pt[1]) &&
            pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi)
          inside = !inside
      }
      return inside
    }

    function pointInGeometry(pt, geom) {
      if (geom.type === 'Polygon')
        return pointInRing(pt, geom.coordinates[0])
      if (geom.type === 'MultiPolygon')
        return geom.coordinates.some(poly => pointInRing(pt, poly[0]))
      return false
    }

    function geoCentroid(geom) {
      const pts = []
      function collect(c) { typeof c[0] === 'number' ? pts.push(c) : c.forEach(collect) }
      collect(geom.coordinates)
      if (!pts.length) return null
      return [
        pts.reduce((s, p) => s + p[0], 0) / pts.length,
        pts.reduce((s, p) => s + p[1], 0) / pts.length,
      ]
    }

    function subregionFromPoint(pt) {
      if (!geoMunicipios || !pt) return null
      const feat = geoMunicipios.features.find(m => pointInGeometry(pt, m.geometry))
      if (!feat) return null
      const sub = sentenceCase(feat.properties.subregion ?? '')
      const idx = subNorm.indexOf(norm(sub))
      return idx !== -1 ? SUBREGIONES_FIJAS[idx] : null
    }

    function resolveSubregion(desc, geometry) {
      // 1. Campo subregión en la descripción
      const subKey = Object.keys(desc).find(k => /subregi/i.test(k))
      if (subKey) {
        const idx = subNorm.indexOf(norm(sentenceCase(String(desc[subKey]))))
        if (idx !== -1) return SUBREGIONES_FIJAS[idx]
      }
      // 2. Campo municipio en la descripción → lookup
      const mpioKey = Object.keys(desc).find(k => /municipio/i.test(k))
      if (mpioKey) {
        const sub = municipioToSub[norm(String(desc[mpioKey]))]
        if (sub) {
          const idx = subNorm.indexOf(norm(sub))
          if (idx !== -1) return SUBREGIONES_FIJAS[idx]
        }
      }
      // 3. Fallback espacial: centroide de la vía contra polígonos de municipios
      return subregionFromPoint(geoCentroid(geometry))
    }

    let longitudTotal    = 0
    const kmPorSubregion = {}
    const viasDetalle    = []

    if (geoVias) {
      for (const f of geoVias.features) {
        const desc = parseDescription(f.properties.description ?? '')
        const km   = calcGeomKm(f.geometry) || extractKm(desc) || 0
        const sub  = resolveSubregion(desc, f.geometry) ?? 'Sin subregión'

        if (km) {
          longitudTotal += km
          kmPorSubregion[sub] = (kmPorSubregion[sub] ?? 0) + km
        }

        // Extraer campos clave de cada vía para los modales de detalle
        const get = (pattern) => {
          const key = Object.keys(desc).find(k => pattern.test(k))
          return key ? String(desc[key]).trim() : ''
        }
        const avanceRaw = parseFloat(get(/avance/i).replace('%', '').replace(',', '.')) || 0

        viasDetalle.push({
          nombre:      f.properties.name ?? 'Sin nombre',
          codigo:      get(/c[oó]digo/i),
          municipio:   sentenceCase(get(/municipio/i)),
          subregion:   sub,
          km:          Math.round(km * 100) / 100,
          avance:      Math.round(avanceRaw * 10) / 10,
          contratista: get(/contratista/i),
          fechaInicio: get(/fecha/i),
          plazo:       get(/plazo/i),
          circuito:    get(/circuito/i),
        })
      }
    }

    const totalKm = longitudTotal || 1
    const subregionesStats = SUBREGIONES_FIJAS.map(name => {
      const km = kmPorSubregion[name] ?? 0
      return {
        name,
        km:  Math.round(km * 100) / 100,
        pct: Math.round((km / totalKm) * 100),
      }
    })

    onStatsLoaded?.({
      viasIntervenidas: totalCircuitos,
      longitudTotal:    Math.round(longitudTotal * 100) / 100,
      municipios:       uniqueMunicipios,
      circuitos:        totalCircuitos,
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
            'text-field': ['get', 'mpio_nombr'],
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
          map.getCanvas().style.cursor = 'pointer'
          if (hoveredMpio !== null)
            map.setFeatureState({ source: 'municipios', id: hoveredMpio }, { hover: false })
          hoveredMpio = e.features[0].id
          map.setFeatureState({ source: 'municipios', id: hoveredMpio }, { hover: true })
          const name  = e.features[0].properties.mpio_nombr ?? ''
          const point = e.point
          hoverLabel.value = { name: capitalize(name), x: point.x, y: point.y, visible: true }
        })
        map.on('mouseleave', 'municipios-fill', () => {
          map.getCanvas().style.cursor = ''
          if (hoveredMpio !== null)
            map.setFeatureState({ source: 'municipios', id: hoveredMpio }, { hover: false })
          hoveredMpio = null
          hoverLabel.value = { ...hoverLabel.value, visible: false }
        })
      } catch (err) {
        console.error('[SIMEVA] Error cargando municipios:', err)
      }
    }

    // ── Capa vías ─────────────────────────────────────────────────────────────
    if (geoVias) {
      try {
        map.addSource('vias', { type: 'geojson', data: geoVias })
        map.addLayer({
          id: 'vias-casing',
          type: 'line',
          source: 'vias',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#ffffff',
            'line-width': ['coalesce', ['get', 'stroke-width'], 5],
            'line-opacity': 0.4,
          },
        })
        map.addLayer({
          id: 'vias-line',
          type: 'line',
          source: 'vias',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color':   ['coalesce', ['get', 'stroke'],         '#ffaa00'],
            'line-width':   ['coalesce', ['get', 'stroke-width'],   5],
            'line-opacity': ['coalesce', ['get', 'stroke-opacity'], 1],
          },
        })

        map.on('click', 'vias-line', (e) => {
          const p    = e.features[0].properties
          const feat = cachedVias.value?.features.find(f => f.properties.name === p.name)
          selectedVia.value = {
            name:        p.name ?? 'Vía',
            description: parseDescription(p.description ?? ''),
            photos:      extractPhotosByPhase(p, p.description ?? ''),
            geometry:    feat?.geometry ?? null,
          }
        })
        map.on('mouseenter', 'vias-line', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'vias-line', () => { map.getCanvas().style.cursor = '' })

        buildCallouts?.(geoVias.features)
        map.on('move',   updateCalloutPositions)
        map.on('resize', updateCalloutPositions)
      } catch (err) {
        console.error('[SIMEVA] Error cargando vías:', err)
      }
    }

    loading.value = false
  }

  return { loading, loadError, fromCache, hoverLabel, selectedVia, cachedMunicipios, cachedVias, loadSimeva }
}
