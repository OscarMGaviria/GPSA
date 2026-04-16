/**
 * Funciones puras extraídas de ViaDetailModal.
 */

/**
 * Parsea el valor de avance desde el objeto description de una vía.
 * Soporta: número, string con %, string con coma decimal.
 */
export function parseAvancePct(description = {}) {
  const raw = description['Avance'] ?? description['avance'] ?? '0'
  return Math.min(100, Math.max(0, parseFloat(String(raw).replace('%', '').replace(',', '.')) || 0))
}

/** Color de la barra según el porcentaje de avance. */
export function getBarColor(pct) {
  if (pct === 0)  return '#9ca3af'
  if (pct >= 100) return '#16a34a'
  return '#0b5640'
}

/** Texto de estado según el porcentaje de avance. */
export function getStatusLabel(pct) {
  if (pct === 0)  return 'Sin iniciar'
  if (pct >= 100) return 'Finalizado'
  return 'En obra'
}

/** Clase CSS del badge de estado. */
export function getStatusClass(pct) {
  if (pct === 0)  return 'pill--pending'
  if (pct >= 100) return 'pill--done'
  return 'pill--active'
}

/**
 * Escapa caracteres especiales de regex en un string.
 * Extraído de la función highlight de MapSearch.
 */
export function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Envuelve las coincidencias de q en <mark> dentro de text.
 */
export function highlight(text, q) {
  if (!text || !q) return text ?? ''
  const re = new RegExp(`(${escapeRegex(q)})`, 'gi')
  return text.replace(re, '<mark>$1</mark>')
}
