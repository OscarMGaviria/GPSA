// Cruce del reporte de gestión predial (public/data/Capas/datos_predial.json)
// con las capas de predios y áreas intervenidas.

const normMatricula = m => String(m ?? '').replace(/\s+/g, '').toUpperCase()
const normProyecto = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/^p\.?a\.?p\.?\s+/, '').trim()

/** Convierte un área del reporte a número solo si el formato no es ambiguo ("188.05", "3509.55 M2"). */
export function parseArea(v) {
  const s = String(v ?? '').replace(/m2|m²/gi, '').trim()
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null
}

/**
 * Busca la fila del reporte para una matrícula. Si la matrícula tiene varias fajas
 * (varias filas), prefiere las del mismo proyecto y elige la de área a afectar
 * más cercana al área del polígono.
 */
export function findPredialRow(rows, matricula, areaM2 = 0, proyecto = '') {
  if (!Array.isArray(rows) || !matricula) return null
  const key = normMatricula(matricula)
  let matches = rows.filter(r => r.Matricula && normMatricula(r.Matricula) === key)
  const sameProject = matches.filter(r => proyecto && normProyecto(r.Proyecto) === normProyecto(proyecto))
  if (sameProject.length) matches = sameProject
  if (matches.length <= 1 || !(areaM2 > 0)) return matches[0] ?? null
  let best = matches[0], bestDiff = Infinity
  for (const r of matches) {
    const a = parseArea(r.Area_Afectar)
    const diff = a === null ? Infinity : Math.abs(a - areaM2)
    if (diff < bestDiff) { best = r; bestDiff = diff }
  }
  return best
}

/** Mezcla la fila del reporte sobre las propiedades del polígono sin sobrescribir con vacíos. */
export function mergePredialRow(props, row) {
  if (!row) return { ...props }
  const out = { ...props }
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && v !== undefined && v !== '') out[k] = v
  }
  return out
}
