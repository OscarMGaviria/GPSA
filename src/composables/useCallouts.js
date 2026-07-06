import { ref } from 'vue'
import { parseDescription, extractKm, calcGeomKm } from '../services/api.js'
import { useMapStore } from '../stores/useMapStore.js'

export function useCallouts(getMap) {
  const store = useMapStore()
  const callouts        = ref([])
  const visibleCallouts = ref([])
  // Conjunto de nombres que deben mostrarse según el filtro activo (sin importar viewport)
  let filteredNames = new Set()

  function collectCoords(coords, out) {
    if (typeof coords[0] === 'number') out.push(coords)
    else coords.forEach(c => collectCoords(c, out))
  }

  function geoCentroid(geometry) {
    const pts = []
    collectCoords(geometry.coordinates, pts)
    if (!pts.length) return [0, 0]
    return [
      pts.reduce((s, p) => s + p[0], 0) / pts.length,
      pts.reduce((s, p) => s + p[1], 0) / pts.length,
    ]
  }

  const LW = 170, LH = 52
  const PAD  = { t: 55, r: 20, b: 20, l: 115 }

  function getExcl(H) {
    return [
      { x1: 0,   y1: H - 155, x2: 175, y2: H },      // Logo A toda máquina
      { x1: 0,   y1: 20,      x2: 112, y2: H - 160 }, // Panel vertical izquierdo
    ]
  }

  function clampLabel(lx, ly, W, H) {
    lx = Math.max(PAD.l + LW / 2, Math.min(W - PAD.r - LW / 2, lx))
    ly = Math.max(PAD.t + LH / 2, Math.min(H - PAD.b - LH / 2, ly))
    for (const z of getExcl(H)) {
      const lx1 = lx - LW / 2, lx2 = lx + LW / 2
      const ly1 = ly - LH / 2, ly2 = ly + LH / 2
      if (lx2 > z.x1 && lx1 < z.x2 && ly2 > z.y1 && ly1 < z.y2) {
        const opts = [
          [z.x2 - lx1 + 4, 0], [-(lx2 - z.x1 + 4), 0],
          [0, z.y2 - ly1 + 4], [0, -(ly2 - z.y1 + 4)],
        ]
        const [bx, by] = opts.reduce((a, b) => Math.hypot(...b) < Math.hypot(...a) ? b : a, opts[0])
        lx = Math.max(PAD.l + LW / 2, Math.min(W - PAD.r - LW / 2, lx + bx))
        ly = Math.max(PAD.t + LH / 2, Math.min(H - PAD.b - LH / 2, ly + by))
      }
    }
    return [lx, ly]
  }

  // Offsets (dx, dy) de cada etiqueta respecto a su centroide en pantalla
  // Se calculan una vez con la fuerza y se reutilizan en cada movimiento del mapa
  let _offsets = []

  // Posiciona y separa etiquetas con fuerzas simultáneas (sin oscilación)
  function layoutAndPlace(candidates) {
    if (!candidates.length) return []
    const map = getMap()
    if (!map) return []
    const canvas = map.getCanvas()
    const W = canvas.offsetWidth, H = canvas.offsetHeight
    const screens = candidates.map(c => map.project(c.centroid))
    const ccx = screens.reduce((s, p) => s + p.x, 0) / screens.length
    const ccy = screens.reduce((s, p) => s + p.y, 0) / screens.length

    // Posición inicial: empujar cada etiqueta lejos del centro del cluster
    let labels = candidates.map((c, i) => {
      const sx = screens[i].x, sy = screens[i].y
      let dx = sx - ccx, dy = sy - ccy
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const [lx, ly] = clampLabel(sx + dx / len * 220, sy + dy / len * 220, W, H)
      return { ...c, screenX: sx, screenY: sy, labelX: lx, labelY: ly }
    })

    // Fuerzas simultáneas: calcular todas antes de aplicar (evita oscilación)
    for (let iter = 0; iter < 120; iter++) {
      const forces = labels.map(() => [0, 0])
      let anyOverlap = false
      for (let i = 0; i < labels.length; i++) {
        for (let j = i + 1; j < labels.length; j++) {
          const dx = labels[i].labelX - labels[j].labelX
          const dy = labels[i].labelY - labels[j].labelY
          const ox = LW + 10 - Math.abs(dx)
          const oy = LH + 10 - Math.abs(dy)
          if (ox > 0 && oy > 0) {
            anyOverlap = true
            const [fx, fy] = ox < oy
              ? [Math.sign(dx || 1) * ox * 0.55, 0]
              : [0, Math.sign(dy || 1) * oy * 0.55]
            forces[i][0] += fx; forces[i][1] += fy
            forces[j][0] -= fx; forces[j][1] -= fy
          }
        }
      }
      if (!anyOverlap) break
      labels = labels.map((l, i) => {
        const [nx, ny] = clampLabel(l.labelX + forces[i][0], l.labelY + forces[i][1], W, H)
        return { ...l, labelX: nx, labelY: ny }
      })
    }

    const result = labels.map(l => {
      const edX = l.screenX - l.labelX, edY = l.screenY - l.labelY
      const edL = Math.sqrt(edX * edX + edY * edY) || 1
      return { ...l, lineEndX: l.labelX + (edX / edL) * (LW / 2), lineEndY: l.labelY + (edY / edL) * (LH / 2) }
    })

    // Guardar offsets para poder seguir el mapa en cada pan
    _offsets = result.map(l => ({ dx: l.labelX - l.screenX, dy: l.labelY - l.screenY }))
    return result
  }

  function buildCallouts(features) {
    callouts.value = features.map(f => {
      const desc      = parseDescription(f.properties.description ?? '')
      const km        = calcGeomKm(f.geometry) || extractKm(desc) || 0
      const subKey    = Object.keys(desc).find(k => /subregi/i.test(k))
      const subregion = subKey ? String(desc[subKey]).toUpperCase() : ''
      return {
        name:     f.properties.name ?? 'Vía',
        km,
        subregion,
        centroid: geoCentroid(f.geometry),
        screenX: 0, screenY: 0,
        labelX:  0, labelY:  0,
        lineEndX: 0, lineEndY: 0,
      }
    })
    visibleCallouts.value = []
    updateCalloutPositions()
  }

  function isInViewport(c) {
    const map = getMap()
    if (!map || !c.centroid) return false
    const canvas = map.getCanvas()
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    const bounds = map.getBounds()
    const [lng, lat] = c.centroid
    // Verificar si el centroide está dentro de los límites geográficos visibles
    if (lng < bounds.getWest() || lng > bounds.getEast() ||
        lat < bounds.getSouth() || lat > bounds.getNorth()) return false
    // Verificar también que la posición en pantalla esté dentro del canvas
    const screen = map.project(c.centroid)
    return screen.x >= 0 && screen.x <= W && screen.y >= 0 && screen.y <= H
  }

  function updateCalloutPositions() {
    if (!filteredNames.size || !visibleCallouts.value.length) return
    const map = getMap()
    if (!map) return

    // Reprojectar centroides y aplicar offsets guardados → labels siguen el mapa
    visibleCallouts.value = visibleCallouts.value.map((l, i) => {
      const screen = map.project(l.centroid)
      const sx = screen.x, sy = screen.y
      const dx = _offsets[i]?.dx ?? 0
      const dy = _offsets[i]?.dy ?? 0
      const lx = sx + dx, ly = sy + dy
      const edX = sx - lx, edY = sy - ly
      const edL = Math.sqrt(edX * edX + edY * edY) || 1
      return {
        ...l,
        screenX: sx, screenY: sy,
        labelX: lx, labelY: ly,
        lineEndX: lx + (edX / edL) * (LW / 2),
        lineEndY: ly + (edY / edL) * (LH / 2),
      }
    })
  }

  function refreshVisibleCallouts(filters) {
    const sub      = filters.subregion ?? ''
    const mpio     = filters.municipio ?? ''
    const circuito = filters.circuito  ?? ''
    const search   = filters.search    ?? ''

    const hasFilter =
      (sub      && sub      !== 'Todas las subregiones') ||
      (mpio     && mpio     !== 'Todos los municipios')  ||
      (circuito && circuito !== 'Todos los circuitos')   ||
      !!search.trim()

    if (!hasFilter) {
      filteredNames = new Set()
      _offsets = []
      visibleCallouts.value = []
      return
    }

    // Usar los mismos nombres que ya filtró el store (anidado: sub → mpio → circuito → search)
    const allowedNames = new Set(store.filteredStats.viasDetalle.map(v => v.nombre))
    filteredNames = allowedNames

    const filtered = callouts.value.filter(c => allowedNames.has(c.name))
    visibleCallouts.value = layoutAndPlace(filtered.filter(isInViewport))
  }

  return { callouts, visibleCallouts, buildCallouts, updateCalloutPositions, refreshVisibleCallouts }
}
