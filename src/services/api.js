const ENDPOINTS = {
  localizaciones: import.meta.env.VITE_API_LOCALIZACIONES,
  municipios:     import.meta.env.VITE_API_MUNICIPIOS,
}

const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 horas

function cacheKey(url) { return `simeva_cache_${url}` }

function readCache(url) {
  try {
    const raw = localStorage.getItem(cacheKey(url))
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(cacheKey(url)); return null }
    return data
  } catch { return null }
}

function writeCache(url, data) {
  try { localStorage.setItem(cacheKey(url), JSON.stringify({ data, ts: Date.now() })) } catch { /* storage lleno */ }
}

async function fetchGeoJSON(url) {
  let text
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Error ${res.status}`)
    text = await res.text()
  } catch (err) {
    // Sin red o error HTTP → intentar caché
    const cached = readCache(url)
    if (cached) { console.warn(`[SIMEVA] Sin conexión — usando caché para ${url}`); return { data: cached, fromCache: true } }
    throw err
  }

  // Intento 1: JSON válido
  try {
    const data = JSON.parse(text)
    writeCache(url, data)
    return { data, fromCache: false }
  } catch { /* continúa */ }

  // Intento 2: JSON truncado → recuperar features
  const recovered = recoverFeatureCollection(text)
  if (recovered) {
    console.warn(`[SIMEVA] JSON truncado en ${url} — recuperados ${recovered.features.length} features`)
    writeCache(url, recovered)
    return { data: recovered, fromCache: false }
  }

  // Último recurso: caché
  const cached = readCache(url)
  if (cached) { console.warn(`[SIMEVA] JSON inválido — usando caché para ${url}`); return { data: cached, fromCache: true } }

  throw new Error(`No se pudo parsear el GeoJSON de ${url}`)
}

/**
 * Cuando el servidor mock trunca el JSON, recorre el texto carácter a carácter
 * rastreando profundidad de llaves para encontrar el último feature completo,
 * y reconstruye un FeatureCollection válido con los features que alcanzaron a cerrarse.
 */
function recoverFeatureCollection(text) {
  // Localizar el inicio del array de features
  const featIdx   = text.indexOf('"features"')
  if (featIdx === -1) return null
  const arrStart  = text.indexOf('[', featIdx)
  if (arrStart === -1) return null

  // Rastrear qué posiciones corresponden al cierre de cada feature top-level
  const closings = []   // índices donde depth vuelve a 0 (cada feature cerrado)
  let depth   = 0
  let inStr   = false
  let escaped = false

  for (let i = arrStart + 1; i < text.length; i++) {
    const ch   = text[i]
    const code = text.charCodeAt(i)

    if (escaped)              { escaped = false; continue }
    if (ch === '\\' && inStr) { escaped = true;  continue }
    if (ch === '"')           { inStr = !inStr;  continue }
    if (inStr) continue

    if      (ch === '{') { depth++ }
    else if (ch === '}') {
      depth--
      if (depth === 0) closings.push(i)
    }
  }

  if (closings.length === 0) return null

  // Extraer el JSON de los features hasta el último cerrado
  const lastClose   = closings[closings.length - 1]
  const featuresRaw = text.substring(arrStart + 1, lastClose + 1).trim().replace(/,\s*$/, '')

  try {
    const features = JSON.parse(`[${featuresRaw}]`)
    return { type: 'FeatureCollection', features }
  } catch {
    return null
  }
}

export const getLocalizaciones = () => fetchGeoJSON(ENDPOINTS.localizaciones)
export const getMunicipios     = () => fetchGeoJSON(ENDPOINTS.municipios)

/** Extrae URLs de imágenes del HTML de descripción */
export function extractPhotos(htmlString) {
  if (!htmlString) return []
  try {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html')
    return [...doc.querySelectorAll('img')]
      .map(img => img.getAttribute('src'))
      .filter(src => src && /^https?:\/\//i.test(src))
  } catch { return [] }
}

/**
 * Extrae fotos organizadas en fases (antes/durante/después)
 * buscando en las propiedades del feature y en el HTML de descripción.
 */
export function extractPhotosByPhase(props = {}, htmlDescription = '') {
  const result = { antes: [], durante: [], despues: [] }

  const PHASE = {
    antes:   /antes|before|inicio|pre[-_]/i,
    durante: /durante|during|en[-_]?obra|proceso/i,
    despues: /despu[eé]s|after|post[-_]|final/i,
  }

  // Buscar en propiedades del feature
  for (const [key, val] of Object.entries(props)) {
    if (!val || typeof val !== 'string') continue
    const urls = val.split(/[,;\s]+/).filter(v => /^https?:\/\//i.test(v))
    if (!urls.length) continue
    for (const [phase, pattern] of Object.entries(PHASE)) {
      if (pattern.test(key)) { result[phase].push(...urls); break }
    }
  }

  // Fallback: imágenes del HTML → poner en "durante"
  if (!result.antes.length && !result.durante.length && !result.despues.length) {
    result.durante = extractPhotos(htmlDescription)
  }

  return result
}

/**
 * Extrae texto plano de la descripción HTML que viene en cada feature de localizaciones.
 * Retorna un objeto con los campos más relevantes.
 */
/**
 * Intenta extraer el valor numérico de km del objeto parseado de descripción.
 * Busca claves como "Longitud", "Km", "Kilómetros", o valores con "km" en el texto.
 */
/**
 * Calcula la longitud real de una geometría GeoJSON (LineString o MultiLineString)
 * usando la fórmula de Haversine. Retorna kilómetros.
 */
export function calcGeomKm(geometry) {
  if (!geometry) return 0

  function haversine(a, b) {
    const R    = 6371
    const dLat = (b[1] - a[1]) * Math.PI / 180
    const dLng = (b[0] - a[0]) * Math.PI / 180
    const s    = Math.sin(dLat / 2) ** 2
               + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180)
               * Math.sin(dLng / 2) ** 2
    return 2 * R * Math.asin(Math.sqrt(s))
  }

  function lineKm(coords) {
    let total = 0
    for (let i = 0; i < coords.length - 1; i++) total += haversine(coords[i], coords[i + 1])
    return total
  }

  if (geometry.type === 'LineString')
    return lineKm(geometry.coordinates)

  if (geometry.type === 'MultiLineString')
    return geometry.coordinates.reduce((sum, line) => sum + lineKm(line), 0)

  return 0
}

export function extractKm(desc) {
  if (!desc || typeof desc !== 'object') return null
  // Buscar clave que hable de longitud/km
  const kmKey = Object.keys(desc).find(k => /longitud|kilóm|^km$/i.test(k))
  if (kmKey) {
    const match = String(desc[kmKey]).replace(',', '.').match(/[\d.]+/)
    if (match) return parseFloat(match[0])
  }
  // Fallback: buscar patrón "X km" en cualquier valor
  for (const val of Object.values(desc)) {
    const m = String(val).replace(',', '.').match(/([\d.]+)\s*km/i)
    if (m) return parseFloat(m[1])
  }
  return null
}

export function parseDescription(htmlString) {
  if (!htmlString) return {}
  const parser = new DOMParser()
  const doc    = parser.parseFromString(htmlString, 'text/html')
  const rows   = doc.querySelectorAll('tr')
  const result = {}
  rows.forEach(row => {
    const cells = row.querySelectorAll('td')
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim()
      const val = cells[1].textContent.trim()
      if (key) result[key] = val
    }
  })
  return result
}
