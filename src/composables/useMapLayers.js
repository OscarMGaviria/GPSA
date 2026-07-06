import { ref, onUnmounted } from 'vue'
import { getLocalizaciones, getMunicipios } from '../services/api.js'
import { pctTiempoTranscurrido } from '../utils/stats.js'
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

function capitalize(str) {
  if (!str) return str
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export function useMapLayers(getMap, { onOptionsLoaded, onStatsLoaded } = {}, { buildCallouts, updateCalloutPositions } = {}) {
  const store          = useMapStore()
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
    const norm = s => (s ?? '').toLowerCase().normalize('NFD').replaceAll(/[̀-ͯ]/g, '').trim()

    const SUBREGIONES_FIJAS = [
      'Valle de aburrá', 'Oriente', 'Occidente', 'Norte',
      'Nordeste', 'Urabá', 'Bajo cauca', 'Magdalena medio', 'Suroeste',
    ]
    const subNorm = SUBREGIONES_FIJAS.map(norm)

    function canonicalSub(raw) {
      const idx = subNorm.indexOf(norm(sentenceCase(raw ?? '')))
      return idx !== -1 ? SUBREGIONES_FIJAS[idx] : sentenceCase(raw ?? '')
    }

    function _extractFilterOptions(geoMunicipios, geoVias) {
      const subregiones = geoMunicipios
        ? [...new Set(geoMunicipios.features.map(f => canonicalSub(f.properties.SUBREGION)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
        : []
      const municipioOpts = geoVias
        ? [...new Set(geoVias.features.map(f => sentenceCase(f.properties.MPIO_NOMBR)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
        : []
      const circuitos = geoVias
        ? [...new Set(geoVias.features.map(f => f.properties.CIRCUITO).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
        : []
      
      const municipiosConVias = new Set(geoVias?.features.map(f => sentenceCase(f.properties.MPIO_NOMBR)).filter(Boolean) ?? [])
      const municipiosPorSubregion = {}
      if (geoMunicipios) {
        for (const f of geoMunicipios.features) {
          const sub = canonicalSub(f.properties.SUBREGION)
          const mpio = sentenceCase(f.properties.MPIO_NOMBR)
          if (sub && mpio && municipiosConVias.has(mpio)) {
            if (!municipiosPorSubregion[sub]) municipiosPorSubregion[sub] = []
            if (!municipiosPorSubregion[sub].includes(mpio)) municipiosPorSubregion[sub].push(mpio)
          }
        }
        for (const k of Object.keys(municipiosPorSubregion)) municipiosPorSubregion[k].sort((a, b) => a.localeCompare(b, 'es'))
      }

      onOptionsLoaded?.({
        subregiones: ['Todas las subregiones', ...subregiones],
        municipios: ['Todos los municipios', ...municipioOpts],
        circuitos: ['Todos los circuitos', ...circuitos],
        municipiosPorSubregion,
      })
    }

    _extractFilterOptions(geoMunicipios, geoVias)

    // ── Estadísticas desde propiedades directas del GeoJSON ──────────────────
    function _calculateViasStats(geoVias) {
      const viasDetalle = []
      let longitudTotal = 0
      const kmPorSubregion = {}

      if (geoVias) {
        for (const f of geoVias.features) {
          const p = f.properties
          const km = Number.parseFloat(p.Long_km) || 0
          const sub = canonicalSub(p.SUBREGION) ?? 'Sin subregión'
          const mpio = sentenceCase(p.MPIO_NOMBR ?? '')

          longitudTotal += km
          if (km) kmPorSubregion[sub] = (kmPorSubregion[sub] ?? 0) + km

          viasDetalle.push({
            nombre: p.NOMBRE_VIA ?? 'Sin nombre',
            codigo: p.CODIGO_VIA ?? '',
            municipio: mpio,
            subregion: sub,
            km: Math.round(km * 100) / 100,
            avance: Math.round((Number.parseFloat(p.AV_FISICO) || 0) > 1 ? (Number.parseFloat(p.AV_FISICO) || 0) : (Number.parseFloat(p.AV_FISICO) || 0) * 100),
            avanceFin: Math.round((Number.parseFloat(p.AV_FINAN) || 0) > 1 ? (Number.parseFloat(p.AV_FINAN) || 0) : (Number.parseFloat(p.AV_FINAN) || 0) * 100),
            estabilizado: Math.round((Number.parseFloat(p.ESTABILIZADO) || 0) * 100) / 100,
            contratista: p.CONTRATIST ?? '',
            contrato: p.CTO ?? '',
            interventor: p.INTERV ?? '',
            plazoMeses: Number.parseFloat(p.PLAZO_MESE) || 0,
            plazo: p.PLAZO_MESE ? `${p.PLAZO_MESE} meses` : '',
            circuito: p.CIRCUITO ?? '',
            fechaIni: p.FECHA_INI ?? '',
          })
        }
      }

      const totalKm = longitudTotal || 1
      const subregionesStats = SUBREGIONES_FIJAS.map(name => {
        const km = kmPorSubregion[name] ?? 0
        return { name, km: Math.round(km * 100) / 100, pct: Math.round((km / totalKm) * 100) }
      })

      const uniqueVias = new Set(geoVias?.features.map(f => f.properties.NOMBRE_VIA).filter(Boolean)).size
      const uniqueMunicipios = new Set(geoVias?.features.map(f => f.properties.MPIO_NOMBR).filter(Boolean)).size
      const uniqueCircuitos = new Set(geoVias?.features.map(f => f.properties.CIRCUITO).filter(Boolean)).size

      onStatsLoaded?.({
        viasIntervenidas: uniqueVias,
        longitudTotal: Math.round(longitudTotal * 100) / 100,
        municipios: uniqueMunicipios,
        circuitos: uniqueCircuitos,
        subregiones: subregionesStats,
        viasDetalle,
      })
    }

    _calculateViasStats(geoVias)

    if (destroyed) return

    // ── Capa municipios ───────────────────────────────────────────────────────
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
            nombre: sentenceCase(p.MPIO_NOMBR ?? ''),
            subregion: canonicalSub(p.SUBREGION),
          }
        })
      } catch (err) {
        console.error('[SIMEVA] Error cargando municipios:', err)
      }
    }

    if (geoMunicipios) {
      _setupMunicipiosLayer(map, geoMunicipios, geoVias)
    }

    // ── Capa vías ─────────────────────────────────────────────────────────────
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

        map.on('click', 'vias-hit-target', (e) => {
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
        })

        map.on('mousemove', 'vias-hit-target', (e) => {
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
        })
        map.on('mouseleave', 'vias-hit-target', () => {
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

    if (geoVias) {
      _setupViasLayer(map, geoVias)
    }

    loading.value = false
  }

  return { loading, loadError, fromCache, hoverLabel, viaHoverLabel, selectedVia, selectedMpio, cachedMunicipios, cachedVias, loadSimeva }
}
