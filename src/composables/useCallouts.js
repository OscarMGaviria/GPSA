import { ref } from 'vue'
import { parseDescription, extractKm, calcGeomKm } from '../services/api.js'

export function useCallouts(getMap) {
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

  function computeCalloutLayout(c) {
    const map = getMap()
    if (!map) return c
    const canvas = map.getCanvas()
    const W  = canvas.offsetWidth
    const H  = canvas.offsetHeight
    const cx = W / 2
    const cy = H / 2
    const PUSH = 160
    const LW   = 170
    const LH   = 52

    // Margen base: izquierda aumentado para cubrir los letreros verticales de subregión
    const PAD = { t: 50, r: 16, b: 16, l: 110 }

    // Zonas de exclusión de elementos UI fijos del mapa
    // Cada zona es { x1, y1, x2, y2 } en píxeles del canvas
    const EXCL = [
      // Logo "A Toda Máquina": bottom-left, ~160px ancho × 145px alto
      { x1: 0,   y1: H - 145, x2: 165, y2: H },
      // Letreros verticales subregión/municipio: top-left
      { x1: 0,   y1: 20,      x2: 105, y2: H - 150 },
    ]

    const screen = map.project(c.centroid)
    const sx = screen.x
    const sy = screen.y

    let dx = sx - cx
    let dy = sy - cy
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    dx /= len; dy /= len

    let lx = sx + dx * PUSH
    let ly = sy + dy * PUSH

    // Clamp al área segura base
    lx = Math.max(PAD.l + LW / 2, Math.min(W - PAD.r - LW / 2, lx))
    ly = Math.max(PAD.t + LH / 2, Math.min(H - PAD.b - LH / 2, ly))

    // Empujar fuera de zonas de exclusión (hasta 2 iteraciones)
    for (let pass = 0; pass < 2; pass++) {
      for (const z of EXCL) {
        const lx1 = lx - LW / 2, lx2 = lx + LW / 2
        const ly1 = ly - LH / 2, ly2 = ly + LH / 2
        if (lx2 > z.x1 && lx1 < z.x2 && ly2 > z.y1 && ly1 < z.y2) {
          const pushR = z.x2 - lx1 + 4
          const pushL = lx2 - z.x1 + 4
          const pushD = z.y2 - ly1 + 4
          const pushU = ly2 - z.y1 + 4
          const min   = Math.min(pushR, pushL, pushD, pushU)
          if      (min === pushR) lx += pushR
          else if (min === pushL) lx -= pushL
          else if (min === pushD) ly += pushD
          else                    ly -= pushU
          // Re-clamp después de empujar
          lx = Math.max(PAD.l + LW / 2, Math.min(W - PAD.r - LW / 2, lx))
          ly = Math.max(PAD.t + LH / 2, Math.min(H - PAD.b - LH / 2, ly))
        }
      }
    }

    const edX = sx - lx
    const edY = sy - ly
    const edL = Math.sqrt(edX * edX + edY * edY) || 1

    return {
      ...c,
      screenX: sx, screenY: sy,
      labelX: lx, labelY: ly,
      lineEndX: lx + (edX / edL) * (LW / 2),
      lineEndY: ly + (edY / edL) * (LH / 2),
    }
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
    const map = getMap()
    if (!map) return
    callouts.value = callouts.value.map(computeCalloutLayout)
    // Mostrar los que corresponden al filtro activo Y están en el viewport
    if (filteredNames.size)
      visibleCallouts.value = callouts.value.filter(c => filteredNames.has(c.name) && isInViewport(c))
  }

  function refreshVisibleCallouts(filters) {
    const sub      = filters.subregion ?? ''
    const mpio     = filters.municipio ?? ''
    const circuito = filters.circuito  ?? ''

    const hasFilter =
      (sub      && sub      !== 'Todas las subregiones') ||
      (mpio     && mpio     !== 'Todos los municipios')  ||
      (circuito && circuito !== 'Todos los circuitos')

    if (!hasFilter) {
      filteredNames = new Set()
      visibleCallouts.value = []
      return
    }

    let filtered = callouts.value

    if (circuito && circuito !== 'Todos los circuitos') {
      filtered = filtered.filter(c => c.name === circuito)
    } else if (sub && sub !== 'Todas las subregiones') {
      const subUp = sub.toUpperCase()
      const bySub = filtered.filter(c => c.subregion && c.subregion === subUp)
      if (bySub.length) filtered = bySub
    }

    // Guardar el conjunto filtrado (permanente hasta nuevo filtro)
    filteredNames = new Set(filtered.map(c => c.name))

    // Mostrar solo los que están en el viewport ahora
    visibleCallouts.value = filtered
      .filter(isInViewport)
      .map(computeCalloutLayout)
  }

  return { callouts, visibleCallouts, buildCallouts, updateCalloutPositions, refreshVisibleCallouts }
}
