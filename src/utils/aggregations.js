/**
 * Funciones puras de agregación extraídas de StatsDetailModal.
 * Se pueden probar de forma unitaria sin montar el componente.
 */

// ── Vista: Vías intervenidas (agrupado por circuito) ──────────────────────────
export function calcViasAgrupadas(viasDetalle, busqueda = '', sortKey = 'circuito', sortAsc = true) {
  const map = {}
  for (const v of viasDetalle) {
    const key = v.circuito || v.nombre
    if (!map[key]) {
      map[key] = { circuito: key, subregion: v.subregion, contratista: v.contratista, km: 0, viasMap: {} }
    }
    map[key].km += v.km
    const vk = v.nombre
    if (!map[key].viasMap[vk]) map[key].viasMap[vk] = { nombre: v.nombre, codigo: v.codigo, km: 0 }
    map[key].viasMap[vk].km += v.km
  }

  let rows = Object.values(map).map(r => ({
    circuito:    r.circuito,
    subregion:   r.subregion,
    contratista: r.contratista,
    km:          Math.round(r.km * 100) / 100,
    vias:        Object.values(r.viasMap).map(v => ({ ...v, km: Math.round(v.km * 100) / 100 }))
  }))

  const q = busqueda.toLowerCase()
  if (q) {
    rows = rows.filter(r =>
      r.circuito?.toLowerCase().includes(q) ||
      r.subregion?.toLowerCase().includes(q) ||
      r.contratista?.toLowerCase().includes(q) ||
      r.vias.some(v => v.nombre?.toLowerCase().includes(q) || v.codigo?.toLowerCase().includes(q))
    )
  }

  const sk = sortKey === 'nombre' ? 'circuito' : sortKey
  return rows.sort((a, b) => {
    const va = a[sk] ?? '', vb = b[sk] ?? ''
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
    return sortAsc ? cmp : -cmp
  })
}

// ── Vista: Longitud por municipio (agrupado con circuito y vía) ───────────────
export function calcLongitudAgrupada(viasDetalle, busqueda = '') {
  const map = {}
  for (const v of viasDetalle) {
    const key = v.municipio || 'Sin municipio'
    if (!map[key]) map[key] = { municipio: key, subregion: v.subregion, km: 0, viasMap: {} }
    map[key].km += v.km
    const vk = (v.circuito || '') + '||' + v.nombre
    if (!map[key].viasMap[vk]) map[key].viasMap[vk] = { circuito: v.circuito, nombre: v.nombre, codigo: v.codigo, km: 0 }
    map[key].viasMap[vk].km += v.km
  }

  let rows = Object.values(map)
    .filter(r => r.km > 0)
    .map(r => ({
      municipio: r.municipio,
      subregion: r.subregion,
      km: Math.round(r.km * 100) / 100,
      vias: Object.values(r.viasMap).map(v => ({ ...v, km: Math.round(v.km * 100) / 100 }))
    }))
    .sort((a, b) => b.km - a.km)

  const total = rows.reduce((s, r) => s + r.km, 0) || 1
  rows = rows.map(r => ({ ...r, pctReal: Math.round((r.km / total) * 100) }))

  const q = busqueda.toLowerCase()
  if (!q) return rows
  return rows.filter(r =>
    r.municipio.toLowerCase().includes(q) ||
    r.subregion?.toLowerCase().includes(q) ||
    r.vias.some(v =>
      v.circuito?.toLowerCase().includes(q) ||
      v.nombre?.toLowerCase().includes(q) ||
      v.codigo?.toLowerCase().includes(q)
    )
  )
}

// ── Vista: Municipios ─────────────────────────────────────────────────────────
export function calcMunicipiosRows(viasDetalle, busqueda = '', sortKey = 'km', sortAsc = false) {
  const map = {}
  for (const v of viasDetalle) {
    const key = v.municipio || 'Sin municipio'
    if (!map[key]) map[key] = { nombre: key, subregion: v.subregion, vias: 0, km: 0 }
    map[key].vias++
    map[key].km += v.km
  }
  const rows = Object.values(map).map(r => ({ ...r, km: Math.round(r.km * 100) / 100 }))

  const q = busqueda.toLowerCase()
  const filtered = q
    ? rows.filter(r =>
        r.nombre.toLowerCase().includes(q) ||
        r.subregion.toLowerCase().includes(q)
      )
    : rows

  return filtered.sort((a, b) => {
    const va = a[sortKey] ?? ''
    const vb = b[sortKey] ?? ''
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
    return sortAsc ? cmp : -cmp
  })
}

// ── Vista: Circuitos ──────────────────────────────────────────────────────────
export function calcCircuitosRows(viasDetalle, busqueda = '', sortKey = 'nombre', sortAsc = true) {
  const map = {}
  for (const v of viasDetalle) {
    const key = v.circuito || v.nombre
    if (!map[key]) map[key] = { circuito: key, municipio: v.municipio, subregion: v.subregion, tramos: 0, km: 0, avanceSum: 0, contratista: v.contratista }
    map[key].tramos++
    map[key].km        += v.km
    map[key].avanceSum += v.avance
  }
  const rows = Object.values(map).map(r => ({
    ...r,
    km:     Math.round(r.km * 100) / 100,
    avance: r.tramos ? Math.round((r.avanceSum / r.tramos) * 10) / 10 : 0,
  }))

  const q = busqueda.toLowerCase()
  const filtered = q
    ? rows.filter(r =>
        r.circuito.toLowerCase().includes(q) ||
        r.municipio?.toLowerCase().includes(q) ||
        r.subregion?.toLowerCase().includes(q)
      )
    : rows

  return filtered.sort((a, b) => {
    const va = a[sortKey] ?? ''
    const vb = b[sortKey] ?? ''
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
    return sortAsc ? cmp : -cmp
  })
}

// ── Helpers de badge ──────────────────────────────────────────────────────────
export function avanceBadge(pct) {
  if (pct === 0)  return 'badge--pending'
  if (pct >= 100) return 'badge--done'
  return 'badge--active'
}

export function avanceLabel(pct) {
  if (pct === 0)  return 'Sin iniciar'
  if (pct >= 100) return 'Finalizado'
  return 'En obra'
}
