const base = import.meta.env.BASE_URL.replace(/\/$/, '')
const ENDPOINTS = {
  localizaciones: import.meta.env.VITE_API_LOCALIZACIONES ?? `${base}/data/localizacion.geojson`,
  municipios:     `${base}/data/municipios.geojson`,
  puenteGavinoLocalizacion: `${base}/data/01%20Puente%20gavino/Localizacion.geojson`,
  puenteGavinoPrediosAfectados: `${base}/data/01%20Puente%20gavino/GABINO_OSCAR_poligonos.geojson`,
  miCasitaPrediosAfectados: `${base}/data/01%20Puente%20gavino/Predios_Afectados.geojson`,
  heliconiaPrediosAfectados: `${base}/data/01%20Puente%20gavino/afectaciones_heliconia.geojson`,
  puenteGavinoForestal: `${base}/data/01%20Puente%20gavino/Aprovechamiento_forestal.geojson`,
  puenteGavinoCauce: `${base}/data/01%20Puente%20gavino/Ocupacion_cauce.geojson`,
  puenteGavinoAbscisas: `${base}/data/01%20Puente%20gavino/abscisas.geojson`,
  arcgisInventarioForestal: 'https://services5.arcgis.com/K90UQIB09TmTjUL8/arcgis/rest/services/Inventario_Forestal/FeatureServer/0/query?where=1=1&outFields=*&f=geojson',
  areaIntervenidasVisor: `${base}/data/Capas/Area_Intervenidas_Visor.geojson`,
  prediosIntervenidosVisor: `${base}/data/Capas/Predios_Intervenidos_Visor.geojson`,
  datosPredial: `${base}/data/Capas/datos_predial.json`,
}

// CachÃ© en memoria: evita re-descargar y re-parsear en la misma sesiÃ³n
// (no tiene lÃ­mite de tamaÃ±o como localStorage y es instantÃ¡neo)
const _memCache = {}

function readCache(url)        { return _memCache[url] ?? null }
function writeCache(url, data) { _memCache[url] = data }

async function fetchGeoJSON(url) {
  let text
  try {
    const fetchUrl = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`
    const res = await fetch(fetchUrl)
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const arrayBuffer = await res.arrayBuffer()
    const decoder = new TextDecoder('utf-8')
    text = decoder.decode(arrayBuffer)
  } catch (err) {
    // Sin red o error HTTP â†’ intentar cachÃ©
    const cached = readCache(url)
    if (cached) { console.warn(`[SIMEVA] Sin conexiÃ³n â€” usando cachÃ© para ${url}`); return { data: cached, fromCache: true } }
    throw err
  }

  // Intento 1: JSON vÃ¡lido
  try {
    const parsed = JSON.parse(text)
    // Desempaquetar wrapper { success, data: FeatureCollection }
    const data = parsed?.data?.type === 'FeatureCollection' ? parsed.data : parsed
    writeCache(url, data)
    return { data, fromCache: false }
  } catch { /* continÃºa */ }

  // Intento 2: JSON truncado â†’ recuperar features
  const recovered = recoverFeatureCollection(text)
  if (recovered) {
    console.warn(`[SIMEVA] JSON truncado en ${url} â€” recuperados ${recovered.features.length} features`)
    writeCache(url, recovered)
    return { data: recovered, fromCache: false }
  }

  // Ãšltimo recurso: cachÃ©
  const cached = readCache(url)
  if (cached) { console.warn(`[SIMEVA] JSON invÃ¡lido â€” usando cachÃ© para ${url}`); return { data: cached, fromCache: true } }

  throw new Error(`No se pudo parsear el GeoJSON de ${url}`)
}

/**
 * Cuando el servidor mock trunca el JSON, recorre el texto carÃ¡cter a carÃ¡cter
 * rastreando profundidad de llaves para encontrar el Ãºltimo feature completo,
 * y reconstruye un FeatureCollection vÃ¡lido con los features que alcanzaron a cerrarse.
 */
function recoverFeatureCollection(text) {
  // Localizar el inicio del array de features
  const featIdx   = text.indexOf('"features"')
  if (featIdx === -1) return null
  const arrStart  = text.indexOf('[', featIdx)
  if (arrStart === -1) return null

  // Rastrear quÃ© posiciones corresponden al cierre de cada feature top-level
  const closings = []   // Ã­ndices donde depth vuelve a 0 (cada feature cerrado)
  let depth   = 0
  let inStr   = false
  let escaped = false

  for (let i = arrStart + 1; i < text.length; i++) {
    const ch = text[i]

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

  // Extraer el JSON de los features hasta el Ãºltimo cerrado
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
export const getPuenteGavinoLocalizacion = () => fetchGeoJSON(ENDPOINTS.puenteGavinoLocalizacion)
export function getPuenteGavinoPrediosAfectados() { return fetchGeoJSON(ENDPOINTS.puenteGavinoPrediosAfectados) }
export function getMiCasitaPrediosAfectados() { return fetchGeoJSON(ENDPOINTS.miCasitaPrediosAfectados) }
export function getHeliconiaPrediosAfectados() { return fetchGeoJSON(ENDPOINTS.heliconiaPrediosAfectados) }
export function getPuenteGavinoForestal() { return fetchGeoJSON(ENDPOINTS.puenteGavinoForestal) }
export function getPuenteGavinoCauce() { return fetchGeoJSON(ENDPOINTS.puenteGavinoCauce) }
export function getPuenteGavinoAbscisas() { return fetchGeoJSON(ENDPOINTS.puenteGavinoAbscisas) }
export function getArcgisInventarioForestal() { return fetchGeoJSON(ENDPOINTS.arcgisInventarioForestal) }
export function getAreaIntervenidasVisor() { return fetchGeoJSON(ENDPOINTS.areaIntervenidasVisor) }
export function getPrediosIntervenidosVisor() { return fetchGeoJSON(ENDPOINTS.prediosIntervenidosVisor) }
export function getDatosPredial() { return fetchGeoJSON(ENDPOINTS.datosPredial) }

/** Extrae URLs de imÃ¡genes del HTML de descripciÃ³n */
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
 * Extrae fotos organizadas en fases (antes/durante/despuÃ©s)
 * buscando en las propiedades del feature y en el HTML de descripciÃ³n.
 */
export function extractPhotosByPhase(props = {}, htmlDescription = '') {
  const result = { antes: [], durante: [], despues: [] }

  const PHASE = {
    antes:   /antes|before|inicio|pre[-_]/i,
    durante: /durante|during|en[-_]?obra|proceso/i,
    despues: /despu[eÃ©]s|after|post[-_]|final/i,
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

  // Fallback: imÃ¡genes del HTML â†’ poner en "durante"
  if (!result.antes.length && !result.durante.length && !result.despues.length) {
    result.durante = extractPhotos(htmlDescription)
  }

  return result
}

/**
 * Extrae texto plano de la descripciÃ³n HTML que viene en cada feature de localizaciones.
 * Retorna un objeto con los campos mÃ¡s relevantes.
 */
/**
 * Intenta extraer el valor numÃ©rico de km del objeto parseado de descripciÃ³n.
 * Busca claves como "Longitud", "Km", "KilÃ³metros", o valores con "km" en el texto.
 */
/**
 * Calcula la longitud real de una geometrÃ­a GeoJSON (LineString o MultiLineString)
 * usando la fÃ³rmula de Haversine. Retorna kilÃ³metros.
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
  const kmKey = Object.keys(desc).find(k => /longitud|kilÃ³m|^km$/i.test(k))
  if (kmKey) {
    const match = String(desc[kmKey]).replace(',', '.').match(/[\d.]+/)
    if (match) return Number.parseFloat(match[0])
  }
  // Fallback: buscar patrÃ³n "X km" en cualquier valor
  for (const val of Object.values(desc)) {
    // Cuantificadores acotados (mÃ¡x. 6 dÃ­gitos enteros, 3 decimales) para
    // evitar backtracking super-lineal (SonarQube javascript:S5852).
    const m = /(\d{1,6}(?:\.\d{1,3})?)\s*km/i.exec(String(val).slice(0, 200).replace(',', '.'))
    if (m) return Number.parseFloat(m[1])
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

