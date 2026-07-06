// ── Abreviaturas de subregiones ───────────────────────────────────────────────
export const ABREVIATURAS = {
  'valle de aburra': 'Valle',
  'oriente':         'Oriente',
  'occidente':       'Occidente',
  'norte':           'Norte',
  'nordeste':        'Nordeste',
  'uraba':           'Urabá',
  'bajo cauca':      'Bajo C.',
  'magdalena medio': 'Magd. M.',
  'suroeste':        'Suroeste',
}

/**
 * Devuelve la abreviatura de una subregión, o el nombre original si no existe.
 */
export function shortLabel(name) {
  const key = name.toLowerCase().normalize('NFD').replaceAll(/[̀-ͯ]/g, '')
  return ABREVIATURAS[key] ?? name
}

// ── Fechas de inicio por contrato ─────────────────────────────────────────────
export const FECHA_INICIO_POR_CONTRATO = {
  '25OO111B2821': '2026-01-01',
  '25OO111B2822': '2026-01-01',
  '25OO111B2823': '2026-01-01',
  '25OO111B2824': '2026-01-01',
  '25OO111B2825': '2026-01-01',
  '25OO111B2826': '2026-01-01',
  '4600018883':   '2026-01-01',
}
const FECHA_INICIO_DEFAULT = '2026-01-01'

/**
 * Calcula cuántos meses han transcurrido desde el inicio del contrato hasta hoy.
 */
export function mesesTranscurridos(contrato, hoy = new Date()) {
  const fechaStr = FECHA_INICIO_POR_CONTRATO[contrato] ?? FECHA_INICIO_DEFAULT
  const inicio   = new Date(fechaStr)
  return (hoy.getFullYear() - inicio.getFullYear()) * 12
       + (hoy.getMonth()    - inicio.getMonth())
}

/**
 * Calcula el porcentaje de tiempo transcurrido respecto al plazo total.
 * fechaIni: string en formato DD/MM/YYYY
 * plazoMeses: número de meses del contrato
 */
export function pctTiempoTranscurrido(fechaIni, plazoMeses, hoy = new Date()) {
  if (!fechaIni || !plazoMeses) return 0
  const parts = String(fechaIni).split('/')
  if (parts.length < 3) return 0
  const inicio = new Date(Number.parseInt(parts[2]), Number.parseInt(parts[1]) - 1, Number.parseInt(parts[0]))
  const totalDias = Number.parseFloat(plazoMeses) * 30
  if (!totalDias) return 0
  const diasTranscurridos = (hoy - inicio) / (1000 * 60 * 60 * 24)
  return Math.min(100, Math.max(0, Math.round((diasTranscurridos / totalDias) * 100)))
}

/**
 * Calcula el resumen de avance en km a partir del array de vías.
 * Usa el campo `estabilizado` (km reales intervenidos reportados).
 * Retorna { pct, intervenidos, contractuales, pendientes }
 */
export function calcAvanceKm(vias) {
  if (!vias.length) return { pct: 0, intervenidos: 0, contractuales: 0, pendientes: 0 }
  const contractuales   = vias.reduce((s, v) => s + (v.km           || 0), 0)
  const intervenidos    = vias.reduce((s, v) => s + (v.estabilizado || 0), 0)
  const pendientes      = contractuales - intervenidos
  const pct             = contractuales > 0 ? (intervenidos / contractuales) * 100 : 0

  return {
    pct:           Math.round(pct * 10) / 10,
    intervenidos:  Math.round(intervenidos  * 100) / 100,
    contractuales: Math.round(contractuales * 100) / 100,
    pendientes:    Math.round(pendientes    * 100) / 100,
  }
}
