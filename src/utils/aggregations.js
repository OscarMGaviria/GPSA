/**
 * Funciones puras de agregación extraídas de StatsDetailModal.
 * Se pueden probar de forma unitaria sin montar el componente.
 */

// ── Vista: Vías intervenidas ───────────────────────────────────────────────────
export function groupViasFiltered(viasDetalle, busqueda = '', sortKey = 'nombre', sortAsc = true) {
  const grouped = {}
  for (const v of viasDetalle) {
    const key = v.nombre
    if (!grouped[key]) grouped[key] = { ...v, km: 0 }
    grouped[key].km += v.km
  }
  const lista = Object.values(grouped).map(v => ({ ...v, km: Math.round(v.km * 100) / 100 }))

  const q = busqueda.toLowerCase()
  const filtered = q
    ? lista.filter(v =>
        v.nombre?.toLowerCase().includes(q) ||
        v.municipio?.toLowerCase().includes(q) ||
        v.subregion?.toLowerCase().includes(q) ||
        v.contratista?.toLowerCase().includes(q)
      )
    : lista

  return filtered.sort((a, b) => {
    const va = a[sortKey] ?? ''
    const vb = b[sortKey] ?? ''
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
    return sortAsc ? cmp : -cmp
  })
}

// ── Vista: Longitud por municipio ─────────────────────────────────────────────
export function calcLongitudRows(viasDetalle) {
  const map = {}
  for (const v of viasDetalle) {
    const key = v.municipio || 'Sin municipio'
    if (!map[key]) map[key] = { name: key, subregion: v.subregion, km: 0 }
    map[key].km += v.km
  }
  const rows = Object.values(map)
    .map(r => ({ ...r, km: Math.round(r.km * 100) / 100 }))
    .filter(r => r.km > 0)
    .sort((a, b) => b.km - a.km)
  const total = rows.reduce((s, r) => s + r.km, 0) || 1
  return rows.map(r => ({ ...r, pctReal: Math.round((r.km / total) * 100) }))
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
