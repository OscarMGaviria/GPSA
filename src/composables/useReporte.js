import cronogramasData from '../data/cronogramas.json'

const norm = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
const fmtP = v => v != null ? Number(v).toFixed(2) + '%' : '—'
const fmtC = v => v != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v) : '—'
const fmtCM = v => v != null ? (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${(v / 1e6).toFixed(0)}M`) : '—'
const fmtI = v => v != null ? Number(v).toFixed(2) : '—'
const fmtN = v => v != null ? Number(v).toFixed(1) : '—'
const esc  = s => (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900;1,300&display=swap');

* { margin:0; padding:0; box-sizing:border-box }
html,body { font-family:'Prompt',sans-serif; background:#fff; color:#1a1a1a }
@page { size:A4; margin:0 }
@media print { .no-print { display:none!important } }

/* ── Página base ── */
.page {
  width:210mm; min-height:297mm;
  position:relative; overflow:hidden;
  page-break-after:always;
  background:#fff;
}
.page:last-child { page-break-after:auto }
.page--padded { padding:14mm 14mm 12mm }

/* ══════════════════════════════════════════
   PORTADA
══════════════════════════════════════════ */
.cover {
  background:linear-gradient(155deg,#021a0e 0%,#052318 35%,#0b5640 70%,#1a7a56 100%);
  display:flex; flex-direction:column;
}
.cover-noise {
  position:absolute;inset:0;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events:none;
}
.cover-top {
  flex:1; display:flex; align-items:flex-start;
  padding:14mm 14mm 0;
}
.cover-logo-wrap {
  display:flex;align-items:center;gap:14px;
}
.cover-logo { width:56px;height:56px;object-fit:contain;filter:brightness(0) invert(1) opacity(.9) }
.cover-brand { color:rgba(255,255,255,.7);font-size:8pt;font-weight:400;line-height:1.6;letter-spacing:.03em }
.cover-brand strong { color:#fff;font-weight:700 }

.cover-hero {
  padding:0 14mm;
  flex:2;display:flex;flex-direction:column;justify-content:center;
}
.cover-label {
  font-size:8pt;font-weight:700;letter-spacing:.22em;text-transform:uppercase;
  color:rgba(255,255,255,.5);margin-bottom:10px;
}
.cover-title {
  font-size:52pt;font-weight:900;line-height:.95;
  color:#fff;letter-spacing:-.02em;
}
.cover-title span { color:#3fad72 }
.cover-divider { width:56px;height:4px;background:#3fad72;border-radius:2px;margin:14px 0 }
.cover-subtitle {
  font-size:14pt;font-weight:300;color:rgba(255,255,255,.75);
  font-style:italic;line-height:1.3;max-width:320px;
}

.cover-kpis {
  padding:0 14mm;margin-bottom:14mm;
  display:grid;grid-template-columns:repeat(4,1fr);gap:10px;
}
.cover-kpi {
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.13);
  border-radius:10px;padding:12px 14px;
}
.cover-kpi-val { font-size:26pt;font-weight:900;color:#fff;line-height:1 }
.cover-kpi-lbl { font-size:7pt;color:rgba(255,255,255,.55);margin-top:3px;font-weight:600;text-transform:uppercase;letter-spacing:.06em }

.cover-footer {
  padding:10px 14mm 12mm;
  border-top:1px solid rgba(255,255,255,.12);
  display:flex;align-items:center;justify-content:space-between;
}
.cover-filtros { display:flex;gap:6px;align-items:center;flex-wrap:wrap }
.cover-filtros-lbl { font-size:7.5pt;color:rgba(255,255,255,.4);letter-spacing:.05em;text-transform:uppercase;font-weight:600 }
.cover-tag {
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
  border-radius:99px;padding:3px 10px;
  font-size:7.5pt;font-weight:700;color:#fff;
}
.cover-date { font-size:8pt;color:rgba(255,255,255,.45);font-weight:300 }

/* Decoración portada */
.cover-decor {
  position:absolute;right:-20mm;top:50%;transform:translateY(-50%);
  opacity:.06;pointer-events:none;
}

/* ══════════════════════════════════════════
   PÁGINAS INTERIORES — estilos comunes
══════════════════════════════════════════ */
.pg-header {
  display:flex;align-items:center;gap:10px;
  padding-bottom:8px;margin-bottom:16px;
  border-bottom:2px solid #0b5640;
}
.pg-header-logo { width:32px;height:32px;object-fit:contain }
.pg-header-brand { font-size:7pt;color:#9ca3af;letter-spacing:.04em;font-weight:600;text-transform:uppercase }
.pg-header-title { flex:1;font-size:10pt;font-weight:800;color:#0b5640;letter-spacing:.04em;text-transform:uppercase }
.pg-header-page { font-size:8pt;color:#9ca3af;font-weight:400 }

.pg-footer {
  position:absolute;bottom:10mm;left:14mm;right:14mm;
  display:flex;justify-content:space-between;align-items:center;
  border-top:1px solid #f3f4f6;padding-top:5px;
  font-size:7pt;color:#d1d5db;
}

/* ══════════════════════════════════════════
   SECCIÓN HERO (interior)
══════════════════════════════════════════ */
.sec-hero {
  background:linear-gradient(110deg,#052318 0%,#0b5640 100%);
  border-radius:10px;padding:16px 20px;margin-bottom:16px;
  display:flex;align-items:center;gap:20px;
}
.sec-hero-num {
  font-size:48pt;font-weight:900;color:rgba(255,255,255,.12);
  line-height:1;flex-shrink:0;
}
.sec-hero-content { flex:1 }
.sec-hero-label { font-size:7pt;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:3px }
.sec-hero-title { font-size:18pt;font-weight:800;color:#fff;line-height:1.1 }
.sec-hero-meta { font-size:8pt;color:rgba(255,255,255,.6);margin-top:4px }

/* ══════════════════════════════════════════
   KPI CHIPS INTERIORES
══════════════════════════════════════════ */
.kpi-row { display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px }
.kpi-card {
  background:#f0fdf4;border:1px solid #d1fae5;border-radius:8px;
  padding:10px 12px;position:relative;overflow:hidden;
}
.kpi-card::before {
  content:'';position:absolute;left:0;top:0;bottom:0;width:3px;
  background:#0b5640;border-radius:2px 0 0 2px;
}
.kpi-card-val { font-size:22pt;font-weight:900;color:#0b5640;line-height:1 }
.kpi-card-lbl { font-size:7pt;color:#6b7280;margin-top:4px;font-weight:600;text-transform:uppercase;letter-spacing:.05em }

/* ══════════════════════════════════════════
   TABLAS
══════════════════════════════════════════ */
.tbl-wrap { border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:16px }
.rpt-tbl { width:100%;border-collapse:collapse;font-size:7.5pt }
.rpt-tbl thead tr:first-child th {
  background:#0b5640;color:#fff;padding:6px 8px;
  font-size:7pt;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
  text-align:center;border-right:1px solid rgba(255,255,255,.15);
}
.rpt-tbl thead tr:first-child th.th-e1 { background:#374151 }
.rpt-tbl thead tr:first-child th.th-e2 { background:#1a7a56 }
.rpt-tbl thead tr:first-child th.th-e3 { background:#6d28d9 }
.rpt-tbl thead tr:first-child th.th-real { background:#b45309 }
.rpt-tbl thead tr:first-child th.th-var  { background:#374151 }
.rpt-tbl thead tr:first-child th.th-idx  { background:#6d28d9 }
.rpt-tbl thead tr:first-child th.th-proy { background:#1d4ed8 }
.rpt-tbl thead tr:last-child th {
  background:#f9fafb;color:#6b7280;padding:4px 8px;
  font-size:6.5pt;font-weight:700;text-align:center;
  border-bottom:2px solid #e5e7eb;border-right:1px solid #f0f0f0;
}
.rpt-tbl thead tr:last-child th.th-sub-base  { background:#f0fdf4;color:#0b5640 }
.rpt-tbl thead tr:last-child th.th-sub-real  { background:#fef3c7;color:#92400e }
.rpt-tbl thead tr:last-child th.th-sub-var   { background:#f5f3ff;color:#6d28d9 }
.rpt-tbl thead tr:last-child th.th-sub-idx   { background:#ede9fe;color:#6d28d9 }
.rpt-tbl thead tr:last-child th.th-sub-proy  { background:#eff6ff;color:#1d4ed8 }

.rpt-tbl tbody tr:nth-child(even) { background:#f9fafb }
.rpt-tbl tbody tr:nth-child(odd)  { background:#fff }
.rpt-tbl td {
  padding:5px 8px;border-bottom:1px solid #f3f4f6;
  border-right:1px solid #f3f4f6;text-align:center;vertical-align:middle;
}
.td-left  { text-align:left }
.td-mono  { font-family:monospace;font-size:7.5pt;font-weight:700;color:#0b5640 }
.td-bold  { font-weight:700 }
.td-acum  { background:#f0fdf4!important;font-weight:700;color:#0b5640 }
.td-real  { background:#fef9ec!important;font-weight:700;color:#92400e }
.td-proy  { color:#1d4ed8;font-size:7pt }
.td-ok    { color:#065f46;font-weight:700 }
.td-bad   { color:#b91c1c;font-weight:700 }
.td-warn  { color:#d97706;font-weight:700 }
.td-gray  { color:#9ca3af;font-size:7pt }
.tr-total td { background:#0b5640!important;color:#fff;font-weight:800;font-size:7.5pt;border:none;padding:6px 8px }
.tr-total .td-acum { background:rgba(255,255,255,.12)!important;color:#fff }
.tr-total .td-real { background:rgba(245,158,11,.3)!important;color:#fef3c7 }
.tr-total .td-proy { color:#bfdbfe }

/* Mini barra de avance */
.bar-wrap { min-width:52px }
.bar-pct  { font-size:7.5pt;font-weight:700;color:#0b5640;line-height:1.2 }
.bar-bg   { height:5px;background:#e5e7eb;border-radius:3px;margin-top:2px }
.bar-fill { height:5px;background:#0b5640;border-radius:3px }
.bar-pct--fin  { color:#d97706 }
.bar-fill--fin { background:#d97706 }

/* Badges condición */
.badge { display:inline-block;padding:2px 8px;border-radius:4px;font-size:7pt;font-weight:700;letter-spacing:.03em }
.badge-ok   { background:#dcf5e8;color:#065f46 }
.badge-warn { background:#fef3c7;color:#92400e }
.badge-bad  { background:#fee2e2;color:#991b1b }

/* Ensayos */
.cell-done  { background:#dcf5e8!important;padding:2px 4px!important;font-size:6pt }
.cell-fecha { display:block;font-weight:700;color:#0b5640;font-size:6pt }
.cell-val   { display:block;color:#374151;font-size:5.5pt }

/* Gráfica wrapper */
.chart-box {
  border:1px solid #e5e7eb;border-radius:8px;
  background:#fafafa;padding:4px;margin-bottom:12px;overflow:hidden;
}

/* Separador de sección */
.sec-divider {
  display:flex;align-items:center;gap:10px;margin:14px 0 10px;
}
.sec-divider-line { flex:1;height:1px;background:#e5e7eb }
.sec-divider-label {
  font-size:7pt;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;
}

/* Dos columnas */
.two-col { display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px }
.three-col { display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px }

/* Info pill */
.info-pill {
  display:inline-flex;align-items:center;gap:5px;
  background:#f0fdf4;border:1px solid #d1fae5;border-radius:99px;
  padding:3px 10px;font-size:7.5pt;font-weight:700;color:#0b5640;margin-right:5px;margin-bottom:4px;
}
.info-pill--gray { background:#f3f4f6;border-color:#e5e7eb;color:#4b5563 }

/* Nota al pie de sección */
.sec-note {
  font-size:7pt;color:#9ca3af;font-style:italic;margin-bottom:8px;padding:5px 8px;
  border-left:3px solid #e5e7eb;
}

/* ══════════════════════════════════════════
   TEXTURA DE PAPEL
══════════════════════════════════════════ */
.page-texture {
  position:absolute;inset:0;pointer-events:none;z-index:50;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.88' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23n)' opacity='0.042'/%3E%3C/svg%3E");
  background-size:250px 250px;
}

/* ══════════════════════════════════════════
   TABLA DE CONTENIDOS
══════════════════════════════════════════ */
.toc-overline {
  font-size:7pt;font-weight:800;letter-spacing:.25em;text-transform:uppercase;
  color:#3fad72;margin-bottom:8px;
}
.toc-headline {
  font-size:44pt;font-weight:900;color:#0b5640;line-height:.9;
  letter-spacing:-.03em;margin-bottom:6px;
}
.toc-intro {
  font-size:8.5pt;color:#6b7280;line-height:1.7;max-width:220px;margin-top:12px;
}
.toc-list { list-style:none;margin-top:8px }
.toc-item {
  display:flex;align-items:center;gap:12px;
  padding:13px 0;border-bottom:1px solid #f3f4f6;
}
.toc-item:first-child { border-top:2px solid #0b5640 }
.toc-seq {
  font-size:24pt;font-weight:900;color:#f0f0f0;line-height:1;
  min-width:44px;text-align:right;flex-shrink:0;font-style:italic;
}
.toc-dot { width:10px;height:10px;border-radius:50%;flex-shrink:0 }
.toc-text { flex:1 }
.toc-name { font-size:10.5pt;font-weight:700;color:#111827;line-height:1.2 }
.toc-sub  { font-size:7.5pt;color:#9ca3af;font-weight:400;margin-top:2px }
.toc-pg-line { flex:1;border-bottom:2px dotted #e5e7eb;height:1px;margin:0 8px;align-self:flex-end;margin-bottom:5px }
.toc-pg { font-size:9.5pt;font-weight:700;color:#0b5640;min-width:36px;text-align:right;flex-shrink:0 }

/* ══════════════════════════════════════════
   SEPARADORES DE SECCIÓN (SPLASH)
══════════════════════════════════════════ */
.splash {
  display:flex;flex-direction:column;justify-content:center;
  align-items:flex-start;position:relative;overflow:hidden;
}
.splash-noise {
  position:absolute;inset:0;pointer-events:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}
.splash-bg-num {
  position:absolute;right:-12mm;bottom:-14mm;
  font-size:260pt;font-weight:900;
  color:rgba(255,255,255,.05);line-height:1;letter-spacing:-.05em;
  user-select:none;pointer-events:none;
}
.splash-inner { padding:22mm 18mm;position:relative;z-index:1 }
.splash-label {
  font-size:7.5pt;font-weight:800;letter-spacing:.28em;text-transform:uppercase;
  color:rgba(255,255,255,.42);margin-bottom:12px;
}
.splash-title {
  font-size:40pt;font-weight:900;color:#fff;line-height:.95;letter-spacing:-.02em;
}
.splash-divider-line { width:60px;height:4px;border-radius:2px;margin:18px 0 }
.splash-sub {
  font-size:12.5pt;font-weight:300;color:rgba(255,255,255,.62);
  font-style:italic;line-height:1.45;max-width:300px;
}
.splash-grid {
  position:absolute;inset:0;pointer-events:none;opacity:.04;
  background-image:
    linear-gradient(rgba(255,255,255,.9) 1px,transparent 1px),
    linear-gradient(90deg,rgba(255,255,255,.9) 1px,transparent 1px);
  background-size:28mm 28mm;
}
`

// ── SVG helpers ──────────────────────────────────────────────────────────────

function buildPath(data, xFn, yFn) {
  let d = '', pen = false
  for (let i = 0; i < data.length; i++) {
    if (data[i] != null) {
      d += pen ? ` L${xFn(i).toFixed(1)},${yFn(data[i]).toFixed(1)}`
               : ` M${xFn(i).toFixed(1)},${yFn(data[i]).toFixed(1)}`
      pen = true
    } else pen = false
  }
  return d.trim()
}

function svgLineChart({ labels, datasets, width = 680, height = 190, yMax, yTicks = 4, yFmt = v => v, todayIdx = null }) {
  const ml = 52, mr = 10, mt = 18, mb = 44
  const W = width - ml - mr, H = height - mt - mb
  const n = labels.length

  const xFn = i => ml + (n < 2 ? W / 2 : (i / (n - 1)) * W)
  const yFn = v => mt + H - Math.max(0, Math.min(1, v / yMax)) * H

  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => (yMax / yTicks) * i)
  const grid = tickVals.map(v => {
    const y = yFn(v).toFixed(1)
    return `<line x1="${ml}" y1="${y}" x2="${ml + W}" y2="${y}" stroke="#e5e7eb" stroke-width="0.7"/>
      <text x="${ml - 5}" y="${+y + 3.5}" text-anchor="end" font-size="8" fill="#9ca3af" font-family="sans-serif">${esc(yFmt(v))}</text>`
  }).join('')

  const step = Math.max(1, Math.ceil(n / 10))
  const xLabels = labels.map((l, i) => {
    if (i % step !== 0 && i !== n - 1) return ''
    const x = xFn(i).toFixed(1)
    return `<text x="${x}" y="${mt + H + 14}" text-anchor="end" font-size="7.5" fill="#9ca3af" font-family="sans-serif" transform="rotate(-35,${x},${mt + H + 14})">${esc(l)}</text>`
  }).join('')

  const todayMark = todayIdx != null ? (() => {
    const tx = xFn(todayIdx).toFixed(1)
    return `<line x1="${tx}" y1="${mt}" x2="${tx}" y2="${mt + H}" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,3"/>
      <rect x="${+tx - 14}" y="${mt - 16}" width="28" height="14" rx="3" fill="#f59e0b"/>
      <text x="${tx}" y="${mt - 5}" text-anchor="middle" font-size="8" fill="#fff" font-weight="700" font-family="sans-serif">Hoy</text>`
  })() : ''

  const series = datasets.map(ds => {
    const path = buildPath(ds.data, xFn, yFn)
    if (!path) return ''
    const dots = ds.dotR ? ds.data.map((v, i) =>
      v != null ? `<circle cx="${xFn(i).toFixed(1)}" cy="${yFn(v).toFixed(1)}" r="${ds.dotR}" fill="${ds.color}" stroke="#fff" stroke-width="0.8"/>` : ''
    ).join('') : ''
    return `<path d="${path}" fill="none" stroke="${ds.color}" stroke-width="${ds.width ?? 2}" stroke-linecap="round" stroke-linejoin="round"${ds.dash ? ` stroke-dasharray="${ds.dash}"` : ''}/>${dots}`
  }).join('')

  // legend - 2 per row
  const legend = datasets.map((ds, i) => {
    const row = Math.floor(i / 2), col = i % 2
    const lx = ml + col * (W / 2), ly = mt + H + 26 + row * 12
    return `<line x1="${lx}" y1="${ly}" x2="${lx + 16}" y2="${ly}" stroke="${ds.color}" stroke-width="${ds.width ?? 2}"${ds.dash ? ` stroke-dasharray="${ds.dash}"` : ''} stroke-linecap="round"/>
      <text x="${lx + 20}" y="${ly + 3.5}" font-size="8" fill="#6b7280" font-family="sans-serif">${esc(ds.label)}</text>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;width:100%">
    <rect width="${width}" height="${height}" fill="#fafafa"/>
    ${grid}${todayMark}
    <line x1="${ml}" y1="${mt}" x2="${ml}" y2="${mt + H}" stroke="#d1d5db" stroke-width="1"/>
    <line x1="${ml}" y1="${mt + H}" x2="${ml + W}" y2="${mt + H}" stroke="#d1d5db" stroke-width="1"/>
    ${series}${xLabels}${legend}
  </svg>`
}

function svgMrChart(estaciones) {
  if (!estaciones?.length) return ''
  const W = 680, H = 185, ml = 52, mr = 24, mt = 16, mb = 30
  const CW = W - ml - mr, CH = H - mt - mb
  const n  = estaciones.length
  const bW = Math.max(5, Math.min(18, (CW / n) * 0.32))

  const allVals = estaciones.flatMap(e => [e.mr_medido, e.mr_proyectado ?? e.mr_disenho]).filter(v => v != null)
  const yMax = Math.max(260, ...allVals) * 1.06

  const xFn = i => ml + (n < 2 ? CW / 2 : (i / (n - 1)) * CW)
  const yFn = v => mt + CH - (Math.max(0, v) / yMax) * CH

  const y200 = yFn(200), y100 = yFn(100), yBot = mt + CH
  const bands = `
    <rect x="${ml}" y="${mt}"    width="${CW}" height="${y200 - mt}"    fill="#dcfce7" opacity="0.45"/>
    <rect x="${ml}" y="${y200}"  width="${CW}" height="${y100 - y200}"  fill="#fef9c3" opacity="0.45"/>
    <rect x="${ml}" y="${y100}"  width="${CW}" height="${yBot - y100}"  fill="#fee2e2" opacity="0.45"/>
    <line x1="${ml}" y1="${y200}" x2="${ml + CW}" y2="${y200}" stroke="#16a34a" stroke-width="0.9" stroke-dasharray="4,3"/>
    <text x="${ml + CW + 3}" y="${y200 + 3}" font-size="7" fill="#16a34a" font-family="sans-serif" font-weight="700">200</text>
    <line x1="${ml}" y1="${y100}" x2="${ml + CW}" y2="${y100}" stroke="#d97706" stroke-width="0.9" stroke-dasharray="4,3"/>
    <text x="${ml + CW + 3}" y="${y100 + 3}" font-size="7" fill="#d97706" font-family="sans-serif" font-weight="700">100</text>`

  const ticks = [0, 50, 100, 150, 200, 250].filter(v => v <= yMax)
  const grid = ticks.map(v => {
    const y = yFn(v)
    return `<line x1="${ml}" y1="${y.toFixed(1)}" x2="${ml + CW}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.6"/>
      <text x="${ml - 4}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="#9ca3af" font-family="sans-serif">${v}</text>`
  }).join('')

  const elements = estaciones.map((e, i) => {
    const x = xFn(i), proy = e.mr_proyectado ?? e.mr_disenho
    const parts = []
    if (proy != null) {
      const yP = yFn(proy), bH = Math.max(0, yBot - yP)
      parts.push(`<rect x="${(x - bW - 1).toFixed(1)}" y="${yP.toFixed(1)}" width="${bW}" height="${bH.toFixed(1)}" fill="#b91c1c" opacity="0.3" rx="2"/>`)
    }
    if (e.mr_medido != null) {
      const yM = yFn(e.mr_medido), bH = Math.max(0, yBot - yM)
      const fill = e.mr_medido >= 200 ? '#0b5640' : e.mr_medido >= 100 ? '#d97706' : '#dc2626'
      parts.push(`<rect x="${(x + 1).toFixed(1)}" y="${yM.toFixed(1)}" width="${bW}" height="${bH.toFixed(1)}" fill="${fill}" opacity="0.85" rx="2"/>`)
      parts.push(`<text x="${(x + 1 + bW / 2).toFixed(1)}" y="${(yM - 3).toFixed(1)}" text-anchor="middle" font-size="6.5" fill="${fill}" font-weight="700" font-family="sans-serif">${e.mr_medido}</text>`)
    }
    const lbl = (e.abscisa ?? '').substring(0, 9)
    parts.push(`<text x="${x.toFixed(1)}" y="${(yBot + 13).toFixed(0)}" text-anchor="middle" font-size="6.5" fill="#9ca3af" font-family="sans-serif">${esc(lbl)}</text>`)
    return parts.join('')
  }).join('')

  const ly = H - 6
  const legend = `
    <rect x="${ml}" y="${ly - 7}" width="9" height="7" fill="#0b5640" opacity="0.85" rx="1"/>
    <text x="${ml + 12}" y="${ly}" font-size="8" fill="#6b7280" font-family="sans-serif">Mr Medido</text>
    <rect x="${ml + 85}" y="${ly - 7}" width="9" height="7" fill="#b91c1c" opacity="0.3" rx="1"/>
    <text x="${ml + 97}" y="${ly}" font-size="8" fill="#6b7280" font-family="sans-serif">Mr Proyectado (MPa)</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block;width:100%">
    <rect width="${W}" height="${H}" fill="#fafafa"/>
    ${bands}${grid}
    <line x1="${ml}" y1="${mt}" x2="${ml}" y2="${yBot}" stroke="#d1d5db" stroke-width="1"/>
    <line x1="${ml}" y1="${yBot}" x2="${ml + CW}" y2="${yBot}" stroke="#d1d5db" stroke-width="1"/>
    ${elements}${legend}
  </svg>`
}

// Decoración SVG portada
function svgCoverDecor() {
  const lines = []
  for (let i = 0; i < 18; i++) {
    const y = 30 + i * 28
    const w = 80 + (i % 3) * 40
    lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="rgba(255,255,255,0.18)" stroke-width="${i % 4 === 0 ? 3 : 1}"/>`)
  }
  const dots = []
  for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++)
    dots.push(`<circle cx="${20 + c * 22}" cy="${20 + r * 22}" r="1.8" fill="rgba(255,255,255,0.10)"/>`)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="520" viewBox="0 0 200 520">${lines.join('')}${dots.join('')}</svg>`
}

// ── Paleta por subregión ──────────────────────────────────────────────────────
const SUBREGION_PALETTE = {
  'Bajo Cauca':       { gradient: 'linear-gradient(155deg,#1a1203 0%,#422006 40%,#b45309 100%)', accent: '#fbbf24' },
  'Magdalena Medio':  { gradient: 'linear-gradient(155deg,#1f1635 0%,#2d1b69 40%,#6d28d9 100%)', accent: '#c4b5fd' },
  'Nordeste':         { gradient: 'linear-gradient(155deg,#042f2e 0%,#065f46 40%,#059669 100%)', accent: '#6ee7b7' },
  'Norte':            { gradient: 'linear-gradient(155deg,#021a0e 0%,#052318 35%,#0b5640 100%)', accent: '#34d399' },
  'Occidente':        { gradient: 'linear-gradient(155deg,#1c0a03 0%,#451a03 40%,#c2410c 100%)', accent: '#fb923c' },
  'Oriente':          { gradient: 'linear-gradient(155deg,#0c1a2e 0%,#1e3a5f 40%,#1d4ed8 100%)', accent: '#60a5fa' },
  'Suroeste':         { gradient: 'linear-gradient(155deg,#1f0317 0%,#500724 40%,#be123c 100%)', accent: '#fb7185' },
  'Urabá':            { gradient: 'linear-gradient(155deg,#082f49 0%,#0c4a6e 40%,#0284c7 100%)', accent: '#38bdf8' },
  'Valle de Aburrá':  { gradient: 'linear-gradient(155deg,#111827 0%,#1f2937 40%,#374151 100%)', accent: '#9ca3af' },
}

function getSubregionPalette(sub) {
  return SUBREGION_PALETTE[sub] ?? { gradient: 'linear-gradient(155deg,#111827 0%,#374151 100%)', accent: '#9ca3af' }
}

// Mapa SVG geográfico coloreado por avance (desde features GeoJSON MultiLineString)
function buildSVGMap(features, filterSubregion, palette, width = 290, height = 340) {
  if (!features?.length) return ''
  const normStr = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const filt = filterSubregion
    ? features.filter(f => normStr(f.properties?.SUBREGION) === normStr(filterSubregion))
    : features
  if (!filt.length) return ''

  let x0=Infinity, x1=-Infinity, y0=Infinity, y1=-Infinity
  for (const f of filt) {
    for (const line of (f.geometry?.coordinates ?? [])) {
      for (const [lng, lat] of line) {
        if (lng < x0) x0=lng; if (lng > x1) x1=lng
        if (lat < y0) y0=lat; if (lat > y1) y1=lat
      }
    }
  }
  if (x0 === Infinity) return ''

  const pad  = 14
  const dx   = x1 - x0 || 1, dy = y1 - y0 || 1
  const sc   = Math.min((width - pad*2) / dx, (height - pad*2) / dy)
  const ox   = pad + ((width  - pad*2) - dx*sc) / 2
  const oy   = pad + ((height - pad*2) - dy*sc) / 2
  const px   = lng => (ox + (lng - x0) * sc).toFixed(1)
  const py   = lat => (height - oy - (lat - y0) * sc).toFixed(1)

  const paths = filt.map(f => {
    const av    = parseFloat(f.properties?.AV_FISICO ?? 0)
    const color = av >= 0.8 ? '#34d399' : av >= 0.4 ? palette.accent : av > 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)'
    const d = (f.geometry?.coordinates ?? []).map(line =>
      'M' + line.map(([lng, lat]) => `${px(lng)},${py(lat)}`).join(' L')
    ).join(' ')
    return d ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>` : ''
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${paths}</svg>`
}

// Barras horizontales de avance por circuito (sobre fondo oscuro, para splash)
function svgCircuitosBars(vias, palette, width = 340, height = 260) {
  const map = {}
  for (const v of vias) {
    const key = v.circuito || v.nombre
    if (!map[key]) map[key] = { name: key, sum: 0, n: 0 }
    map[key].sum += (v.avance ?? 0)
    map[key].n++
  }
  const circuitos = Object.values(map)
    .map(c => ({ name: c.name, avance: c.n ? Math.round(c.sum / c.n) : 0 }))
    .sort((a, b) => b.avance - a.avance)
    .slice(0, 9)
  if (!circuitos.length) return ''

  const barH = 20, gap = 6
  const ml = 4, mr = 38, barW = width - ml - mr
  const totalH = circuitos.length * (barH + gap) + 24
  const h = Math.max(height, totalH)

  const bars = circuitos.map((c, i) => {
    const y = 12 + i * (barH + gap)
    const fillW = Math.max(2, (c.avance / 100) * barW)
    const fill = c.avance >= 80 ? '#34d399' : c.avance >= 40 ? palette.accent : 'rgba(255,255,255,0.25)'
    const label = c.name.length > 25 ? c.name.slice(0, 23) + '…' : c.name
    return `<rect x="${ml}" y="${y}" width="${barW}" height="${barH}" fill="rgba(255,255,255,0.07)" rx="3"/>
      <rect x="${ml}" y="${y}" width="${fillW.toFixed(1)}" height="${barH}" fill="${fill}" opacity="0.8" rx="3"/>
      <text x="${ml + 6}" y="${(y + barH * 0.65).toFixed(1)}" font-size="7.5" fill="rgba(255,255,255,0.82)" font-family="sans-serif">${esc(label)}</text>
      <text x="${(ml + barW + 5).toFixed(1)}" y="${(y + barH * 0.65).toFixed(1)}" font-size="9" fill="${palette.accent}" font-family="sans-serif" font-weight="700">${c.avance}%</text>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}">${bars}</svg>`
}

// Página resumen general agrupado por subregión
function buildGlobalResumenPage(logoUrl, fecha, stats, subregionMap, subregiones) {
  const rows = subregiones.map((sub, i) => {
    const vias = subregionMap[sub]
    const circuitos = new Set(vias.map(v => v.circuito || v.nombre)).size
    const km = vias.reduce((s, v) => s + (v.km ?? 0), 0)
    const municipios = new Set(vias.map(v => v.municipio)).size
    const avgAvF  = vias.length ? Math.round(vias.reduce((s, v) => s + (v.avance    ?? 0), 0) / vias.length) : 0
    const avgAfin = vias.length ? Math.round(vias.reduce((s, v) => s + (v.avanceFin ?? 0), 0) / vias.length) : 0
    const p = getSubregionPalette(sub)
    return `<tr>
      <td class="td-gray">${i + 1}</td>
      <td class="td-left td-bold" style="font-size:8.5pt">
        <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${p.accent};margin-right:6px;vertical-align:middle"></span>${esc(sub)}
      </td>
      <td class="td-bold">${circuitos}</td>
      <td>${vias.length}</td>
      <td class="td-bold">${km.toFixed(1)}</td>
      <td>${municipios}</td>
      <td><div class="bar-wrap"><div class="bar-pct">${avgAvF}%</div><div class="bar-bg"><div class="bar-fill" style="width:${Math.min(100,avgAvF)}%"></div></div></div></td>
      <td><div class="bar-wrap"><div class="bar-pct bar-pct--fin">${avgAfin}%</div><div class="bar-bg"><div class="bar-fill bar-fill--fin" style="width:${Math.min(100,avgAfin)}%"></div></div></div></td>
    </tr>`
  }).join('')

  const totalKm = subregiones.reduce((s, sub) => s + subregionMap[sub].reduce((ss, v) => ss + (v.km ?? 0), 0), 0)

  return `
  <div class="page page--padded">
    <div class="page-texture"></div>
    ${pgHeader(logoUrl, 'Resumen por Subregión', 3)}
    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-card-val">${stats.viasIntervenidas}</div><div class="kpi-card-lbl">Tramos intervenidos</div></div>
      <div class="kpi-card"><div class="kpi-card-val">${Number(stats.longitudTotal).toFixed(1)}</div><div class="kpi-card-lbl">Km totales</div></div>
      <div class="kpi-card"><div class="kpi-card-val">${stats.municipios}</div><div class="kpi-card-lbl">Municipios</div></div>
      <div class="kpi-card"><div class="kpi-card-val">${stats.circuitos}</div><div class="kpi-card-lbl">Circuitos</div></div>
    </div>
    <div class="tbl-wrap">
      <table class="rpt-tbl">
        <thead><tr>
          <th style="width:22px">#</th>
          <th class="td-left" style="min-width:120px">Subregión</th>
          <th>Circuitos</th>
          <th>Tramos</th>
          <th>Km</th>
          <th>Municipios</th>
          <th style="min-width:64px">Av. Físico</th>
          <th style="min-width:64px">Av. Financiero</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="tr-total">
          <td colspan="2" class="td-left">TOTAL DEPARTAMENTO</td>
          <td>${stats.circuitos}</td>
          <td>${stats.viasIntervenidas}</td>
          <td>${totalKm.toFixed(1)}</td>
          <td>${stats.municipios}</td>
          <td></td><td></td>
        </tr></tfoot>
      </table>
    </div>
    ${pgFooter(fecha)}
  </div>`
}

// Portada de subregión (splash de dos columnas: KPIs + mapa SVG o barras)
function buildSubregionSplash(subregion, vias, logoUrl, pageNum, secNum, palette, geoFeatures = []) {
  const circuitos  = new Set(vias.map(v => v.circuito || v.nombre)).size
  const km         = vias.reduce((s, v) => s + (v.km ?? 0), 0)
  const municipios = new Set(vias.map(v => v.municipio)).size
  const avgAvF     = vias.length ? Math.round(vias.reduce((s, v) => s + (v.avance ?? 0), 0) / vias.length) : 0

  const svgMap  = buildSVGMap(geoFeatures, subregion, palette, 280, 320)
  const barChart = svgCircuitosBars(vias, palette)
  const rightViz = svgMap || barChart
  const rightLabel = svgMap ? 'Vías intervenidas' : 'Avance por circuito'

  return `
  <div class="page splash" style="background:${palette.gradient}">
    <div class="splash-noise"></div>
    <div class="splash-grid"></div>
    <div class="splash-bg-num" style="right:-8mm;bottom:-10mm;font-size:200pt">${secNum}</div>
    <div style="position:relative;z-index:1;display:flex;min-height:297mm">
      <div style="flex:3;padding:22mm 0 22mm 18mm;display:flex;flex-direction:column;justify-content:center">
        <div class="splash-label">Subregión ${parseInt(secNum, 10)}</div>
        <div class="splash-title">${esc(subregion)}</div>
        <div class="splash-divider-line" style="background:${palette.accent}"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;max-width:260px">
          <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:10px 12px">
            <div style="font-size:24pt;font-weight:900;color:#fff;line-height:1">${circuitos}</div>
            <div style="font-size:6pt;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-top:3px;font-weight:700">Circuitos</div>
          </div>
          <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:10px 12px">
            <div style="font-size:24pt;font-weight:900;color:#fff;line-height:1">${km.toFixed(0)}</div>
            <div style="font-size:6pt;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-top:3px;font-weight:700">Kilómetros</div>
          </div>
          <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:10px 12px">
            <div style="font-size:24pt;font-weight:900;color:#fff;line-height:1">${municipios}</div>
            <div style="font-size:6pt;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-top:3px;font-weight:700">Municipios</div>
          </div>
          <div style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:8px;padding:10px 12px">
            <div style="font-size:24pt;font-weight:900;color:${palette.accent};line-height:1">${avgAvF}%</div>
            <div style="font-size:6pt;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.08em;margin-top:3px;font-weight:700">Av. Físico</div>
          </div>
        </div>
        ${svgMap ? `<div style="margin-top:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="display:flex;align-items:center;gap:5px;font-size:6.5pt;color:rgba(255,255,255,.5)"><span style="display:inline-block;width:16px;height:3px;background:#34d399;border-radius:2px"></span>≥ 80%</span>
          <span style="display:flex;align-items:center;gap:5px;font-size:6.5pt;color:rgba(255,255,255,.5)"><span style="display:inline-block;width:16px;height:3px;background:${palette.accent};border-radius:2px"></span>40–79%</span>
          <span style="display:flex;align-items:center;gap:5px;font-size:6.5pt;color:rgba(255,255,255,.5)"><span style="display:inline-block;width:16px;height:3px;background:rgba(255,255,255,0.4);border-radius:2px"></span>&lt; 40%</span>
        </div>` : ''}
      </div>
      ${rightViz ? `<div style="flex:2;padding:22mm 14mm 22mm 0;display:flex;flex-direction:column;justify-content:center;padding-left:14mm;border-left:1px solid rgba(255,255,255,.09)">
        <div style="font-size:6.5pt;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.38);margin-bottom:10px">${rightLabel}</div>
        ${rightViz}
      </div>` : ''}
    </div>
  </div>`
}

// Página de detalle de circuitos de una subregión
function buildSubregionDetailPage(subregion, vias, logoUrl, fecha, pageNum, secNum, palette) {
  const map = {}
  for (const v of vias) {
    const key = v.circuito || v.nombre
    if (!map[key]) map[key] = { circuito: key, tramos: 0, km: 0, avSum: 0, afSum: 0, mpios: new Set(), contratista: v.contratista }
    map[key].tramos++
    map[key].km    += (v.km ?? 0)
    map[key].avSum += (v.avance    ?? 0)
    map[key].afSum += (v.avanceFin ?? 0)
    map[key].mpios.add(v.municipio)
  }
  const circuitos = Object.values(map).sort((a, b) => a.circuito.localeCompare(b.circuito, 'es'))

  const rows = circuitos.map((c, i) => {
    const avF   = c.tramos ? Math.round(c.avSum  / c.tramos) : 0
    const avFin = c.tramos ? Math.round(c.afSum / c.tramos) : 0
    const mpStr  = [...c.mpios].join(', ')
    const mpDisp = mpStr.length > 30 ? mpStr.slice(0, 28) + '…' : mpStr
    return `<tr>
      <td class="td-gray">${i + 1}</td>
      <td class="td-left td-bold" style="font-size:7.5pt">${esc(c.circuito)}</td>
      <td class="td-left" style="font-size:6.5pt;color:#6b7280">${esc(mpDisp)}</td>
      <td style="font-size:7.5pt">${c.tramos}</td>
      <td class="td-bold" style="font-size:7.5pt">${c.km.toFixed(1)}</td>
      <td><div class="bar-wrap"><div class="bar-pct">${avF}%</div><div class="bar-bg"><div class="bar-fill" style="width:${Math.min(100,avF)}%"></div></div></div></td>
      <td><div class="bar-wrap"><div class="bar-pct bar-pct--fin">${avFin}%</div><div class="bar-bg"><div class="bar-fill bar-fill--fin" style="width:${Math.min(100,avFin)}%"></div></div></div></td>
      <td class="td-left" style="font-size:6.5pt">${esc(c.contratista ?? '')}</td>
    </tr>`
  }).join('')

  const totalKm   = circuitos.reduce((s, c) => s + c.km,     0)
  const totalTrms = circuitos.reduce((s, c) => s + c.tramos, 0)
  const avgAvF    = circuitos.length ? Math.round(circuitos.reduce((s, c) => s + (c.tramos ? c.avSum / c.tramos : 0), 0) / circuitos.length) : 0

  return `
  <div class="page page--padded">
    <div class="page-texture"></div>
    ${pgHeader(logoUrl, `Subregión ${esc(subregion)}`, pageNum)}
    <div class="sec-hero" style="background:${palette.gradient}">
      <div class="sec-hero-num">${secNum}</div>
      <div class="sec-hero-content">
        <div class="sec-hero-label">Circuitos viales intervenidos</div>
        <div class="sec-hero-title">${esc(subregion.toUpperCase())}</div>
        <div class="sec-hero-meta">${circuitos.length} circuitos &nbsp;·&nbsp; ${totalKm.toFixed(1)} km &nbsp;·&nbsp; ${totalTrms} tramos &nbsp;·&nbsp; Avance físico promedio: ${avgAvF}%</div>
      </div>
    </div>
    <div class="tbl-wrap">
      <table class="rpt-tbl">
        <thead><tr>
          <th style="width:22px">#</th>
          <th class="td-left" style="min-width:110px">Circuito</th>
          <th class="td-left">Municipios</th>
          <th>Tramos</th>
          <th>Km</th>
          <th style="min-width:64px">Av. Físico</th>
          <th style="min-width:64px">Av. Financiero</th>
          <th class="td-left" style="min-width:80px">Contratista</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="tr-total">
          <td colspan="3" class="td-left">TOTAL SUBREGIÓN</td>
          <td>${totalTrms}</td>
          <td>${totalKm.toFixed(1)}</td>
          <td colspan="3"></td>
        </tr></tfoot>
      </table>
    </div>
    ${pgFooter(fecha)}
  </div>`
}

// Página de detalle para reporte por municipio
function buildMunicipioDetailPage(municipio, vias, logoUrl, fecha, pageNum, geoFeatures = []) {
  const subregion = vias[0]?.subregion ?? ''
  const palette   = getSubregionPalette(subregion)

  // Group by circuit
  const map = {}
  for (const v of vias) {
    const key = v.circuito || v.nombre
    if (!map[key]) map[key] = { circuito: key, tramos: 0, km: 0, avSum: 0, afSum: 0, contratista: v.contratista }
    map[key].tramos++
    map[key].km    += (v.km ?? 0)
    map[key].avSum += (v.avance    ?? 0)
    map[key].afSum += (v.avanceFin ?? 0)
  }
  const circuitos = Object.values(map).sort((a, b) => a.circuito.localeCompare(b.circuito, 'es'))

  // Flat via rows
  const rows = vias.map((v, i) => {
    const avF   = v.avance    ?? 0
    const avFin = v.avanceFin ?? 0
    return `<tr>
      <td class="td-gray">${i + 1}</td>
      <td class="td-left td-bold" style="font-size:7.5pt">${esc(v.nombre)}</td>
      <td class="td-left" style="font-size:7pt">${esc(v.circuito ?? '')}</td>
      <td class="td-bold" style="font-size:7pt">${v.km ?? '—'}</td>
      <td><div class="bar-wrap"><div class="bar-pct">${avF}%</div><div class="bar-bg"><div class="bar-fill" style="width:${Math.min(100,avF)}%"></div></div></div></td>
      <td><div class="bar-wrap"><div class="bar-pct bar-pct--fin">${avFin}%</div><div class="bar-bg"><div class="bar-fill bar-fill--fin" style="width:${Math.min(100,avFin)}%"></div></div></div></td>
      <td class="td-left" style="font-size:6.5pt">${esc(v.contratista ?? '')}</td>
    </tr>`
  }).join('')

  const totalKm   = vias.reduce((s, v) => s + (v.km ?? 0), 0)
  const avgAvF    = vias.length ? Math.round(vias.reduce((s, v) => s + (v.avance    ?? 0), 0) / vias.length) : 0
  const svgMap    = buildSVGMap(geoFeatures, subregion, palette, 200, 240)

  return `
  <div class="page page--padded">
    <div class="page-texture"></div>
    ${pgHeader(logoUrl, `Municipio ${esc(municipio)}`, pageNum)}
    <div class="sec-hero" style="background:${palette.gradient}">
      <div class="sec-hero-num" style="font-size:14pt">${esc(subregion)}</div>
      <div class="sec-hero-content">
        <div class="sec-hero-label">Vías intervenidas en el municipio</div>
        <div class="sec-hero-title">${esc(municipio.toUpperCase())}</div>
        <div class="sec-hero-meta">${circuitos.length} circuitos &nbsp;·&nbsp; ${vias.length} tramos &nbsp;·&nbsp; ${totalKm.toFixed(1)} km &nbsp;·&nbsp; Avance físico promedio: ${avgAvF}%</div>
      </div>
      ${svgMap ? `<div style="flex-shrink:0;padding-left:12px;opacity:.85">${svgMap}</div>` : ''}
    </div>
    <div class="tbl-wrap">
      <table class="rpt-tbl">
        <thead><tr>
          <th style="width:22px">#</th>
          <th class="td-left" style="min-width:110px">Vía</th>
          <th class="td-left">Circuito</th>
          <th>Km</th>
          <th style="min-width:64px">Av. Físico</th>
          <th style="min-width:64px">Av. Financiero</th>
          <th class="td-left" style="min-width:80px">Contratista</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="tr-total">
          <td colspan="3" class="td-left">TOTAL MUNICIPIO</td>
          <td>${totalKm.toFixed(1)}</td>
          <td colspan="3"></td>
        </tr></tfoot>
      </table>
    </div>
    ${pgFooter(fecha)}
  </div>`
}

// ── Secciones ────────────────────────────────────────────────────────────────

function buildCover(logoUrl, fecha, filters, stats) {
  const hasSub  = filters.subregion && filters.subregion !== 'Todas las subregiones'
  const hasMpio = filters.municipio && filters.municipio !== 'Todos los municipios'
  const hasCir  = filters.circuito  && filters.circuito  !== 'Todos los circuitos'

  // Adapt title & label to active filter
  let coverLabel    = 'Documento de gestión pública'
  let titleLine1    = 'Reporte'
  let titleLine2    = 'Gerencial'
  let coverSubtitle = 'Red Vial Departamental de Antioquia — Sistema SIMEVA'
  let accentColor   = '#3fad72'

  if (hasCir) {
    coverLabel    = 'Análisis detallado de circuito'
    const parts   = filters.circuito.split(' - ')
    titleLine1    = parts[0] ?? filters.circuito
    titleLine2    = parts.slice(1).join(' - ')
    coverSubtitle = 'Reporte Gerencial · Sistema SIMEVA'
  } else if (hasMpio) {
    const pal     = getSubregionPalette(filters.subregion)
    accentColor   = pal.accent
    coverLabel    = `Subregión ${filters.subregion}`
    titleLine1    = 'Municipio'
    titleLine2    = filters.municipio
    coverSubtitle = 'Reporte de Municipio · Sistema SIMEVA'
  } else if (hasSub) {
    const pal     = getSubregionPalette(filters.subregion)
    accentColor   = pal.accent
    coverLabel    = 'Reporte por subregión'
    titleLine1    = filters.subregion
    titleLine2    = ''
    coverSubtitle = 'Red Vial Departamental de Antioquia · Sistema SIMEVA'
  }

  const tags = []
  if (hasSub)  tags.push(filters.subregion)
  if (hasMpio) tags.push(filters.municipio)
  if (hasCir)  tags.push(filters.circuito)
  const tagHtml = tags.length
    ? tags.map(t => `<span class="cover-tag">${esc(t)}</span>`).join('')
    : `<span class="cover-tag" style="opacity:.6">Todos los tramos</span>`

  return `
  <div class="page cover">
    <div class="cover-noise"></div>
    <div class="cover-decor">${svgCoverDecor()}</div>

    <!-- ── Cabecera institucional ── -->
    <div class="cover-top" style="padding:12mm 14mm 0;flex:0 0 auto">
      <div style="display:flex;align-items:center;gap:16px">
        <div style="width:76px;height:76px;background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.22);border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 28px rgba(63,173,114,0.28),inset 0 1px 0 rgba(255,255,255,0.15);flex-shrink:0">
          <img src="${logoUrl}" style="width:56px;height:56px;object-fit:contain;filter:brightness(0) invert(1) opacity(.95)" alt=""/>
        </div>
        <div>
          <div style="font-size:12.5pt;font-weight:800;color:#fff;letter-spacing:-.01em;line-height:1.2">Gobernación de Antioquia</div>
          <div style="font-size:8.5pt;font-weight:400;color:rgba(255,255,255,.62);margin-top:2px;letter-spacing:.01em">Secretaría de Infraestructura Física</div>
          <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
            <div style="width:28px;height:2.5px;background:${accentColor};border-radius:2px"></div>
            <div style="font-size:6.5pt;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.38)">Sistema SIMEVA</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Título principal del reporte ── -->
    <div class="cover-hero">
      <div class="cover-label">${esc(coverLabel)}</div>
      <div class="cover-title" style="font-size:${hasSub || hasMpio ? '38pt' : '52pt'}">${esc(titleLine1)}${titleLine2 ? `<br><span style="color:${accentColor}">${esc(titleLine2)}</span>` : ''}</div>
      <div class="cover-divider" style="background:${accentColor}"></div>
      <div class="cover-subtitle">${esc(coverSubtitle)}</div>
    </div>

    <!-- ── KPIs ── -->
    <div class="cover-kpis">
      <div class="cover-kpi">
        <div class="cover-kpi-val">${stats.viasIntervenidas}</div>
        <div class="cover-kpi-lbl">Tramos</div>
      </div>
      <div class="cover-kpi">
        <div class="cover-kpi-val">${Number(stats.longitudTotal).toFixed(0)}</div>
        <div class="cover-kpi-lbl">Kilómetros</div>
      </div>
      <div class="cover-kpi">
        <div class="cover-kpi-val">${stats.municipios}</div>
        <div class="cover-kpi-lbl">Municipios</div>
      </div>
      <div class="cover-kpi">
        <div class="cover-kpi-val">${stats.circuitos}</div>
        <div class="cover-kpi-lbl">Circuitos</div>
      </div>
    </div>

    <!-- ── Pie ── -->
    <div class="cover-footer">
      <div class="cover-filtros">
        <span class="cover-filtros-lbl">Alcance&nbsp;</span>
        ${tagHtml}
      </div>
      <div class="cover-date">${esc(fecha)}</div>
    </div>
  </div>`
}

function pgHeader(logoUrl, title, page) {
  return `
  <div class="pg-header">
    <img src="${logoUrl}" class="pg-header-logo" alt=""/>
    <div>
      <div class="pg-header-brand">Gobernación de Antioquia · SIMEVA</div>
      <div class="pg-header-title">${esc(title)}</div>
    </div>
    <div class="pg-header-page">Pág. ${page}</div>
  </div>`
}

function pgFooter(fecha) {
  return `<div class="pg-footer"><span>Sistema SIMEVA — Gobernación de Antioquia</span><span>${esc(fecha)}</span></div>`
}

function buildTOCPage(logoUrl, fecha, tocEntries) {
  const items = tocEntries.map((e, i) => `
    <li class="toc-item">
      <span class="toc-seq">${String(i + 1).padStart(2, '0')}</span>
      <span class="toc-dot" style="background:${e.color}"></span>
      <span class="toc-text">
        <span class="toc-name">${esc(e.name)}</span>
        <span class="toc-sub">${esc(e.sub ?? '')}</span>
      </span>
      <span class="toc-pg-line"></span>
      <span class="toc-pg">Pág. ${e.pg}</span>
    </li>`).join('')

  return `
  <div class="page page--padded" style="background:#fff">
    <div class="page-texture"></div>
    ${pgHeader(logoUrl, 'Tabla de Contenidos', 2)}
    <div style="display:grid;grid-template-columns:1fr 1.15fr;gap:20mm;align-items:start;margin-top:8px">
      <div>
        <div class="toc-overline">Reporte Gerencial · SIMEVA</div>
        <div class="toc-headline">Con<span style="color:#3fad72">te</span>nido</div>
        <div style="width:48px;height:3px;background:#3fad72;border-radius:2px;margin:10px 0 14px"></div>
        <div class="toc-intro">Sistema de Monitoreo y Evaluación de Vías — Gobernación de Antioquia · Secretaría de Infraestructura Física</div>
        <div style="margin-top:24px;padding:14px 16px;background:#f0fdf4;border-radius:10px;border-left:4px solid #0b5640">
          <div style="font-size:7pt;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#0b5640;margin-bottom:6px">Fecha de generación</div>
          <div style="font-size:9pt;color:#374151;font-weight:600">${esc(fecha)}</div>
        </div>
      </div>
      <ul class="toc-list">${items}</ul>
    </div>
    ${pgFooter(fecha)}
  </div>`
}

function buildSectionSplash(num, title, subtitle, gradient, accentColor) {
  return `
  <div class="page splash" style="background:${gradient}">
    <div class="splash-noise"></div>
    <div class="splash-grid"></div>
    <div class="splash-bg-num">${num}</div>
    <div class="splash-inner">
      <div class="splash-label">Sección ${num}</div>
      <div class="splash-title">${esc(title)}</div>
      <div class="splash-divider-line" style="background:${accentColor}"></div>
      <div class="splash-sub">${esc(subtitle)}</div>
    </div>
  </div>`
}

function buildResumenPage(logoUrl, fecha, stats) {
  const rows = (stats.viasDetalle ?? []).map((v, i) => `<tr>
    <td class="td-gray">${i + 1}</td>
    <td class="td-left td-bold" style="font-size:7.5pt">${esc(v.nombre)}</td>
    <td class="td-left" style="font-size:7pt">${esc(v.municipio)}</td>
    <td class="td-left" style="font-size:7pt">${esc(v.subregion)}</td>
    <td style="font-size:7pt">${esc(v.circuito ?? '')}</td>
    <td class="td-bold">${v.km ?? '—'}</td>
    <td><div class="bar-wrap">
      <div class="bar-pct">${v.avance ?? 0}%</div>
      <div class="bar-bg"><div class="bar-fill" style="width:${v.avance ?? 0}%"></div></div>
    </div></td>
    <td><div class="bar-wrap">
      <div class="bar-pct bar-pct--fin">${v.avanceFin ?? 0}%</div>
      <div class="bar-bg"><div class="bar-fill bar-fill--fin" style="width:${v.avanceFin ?? 0}%"></div></div>
    </div></td>
    <td class="td-left" style="font-size:7pt">${esc(v.contratista ?? '')}</td>
    <td style="font-size:7pt">${esc(v.plazo ?? '')}</td>
  </tr>`).join('')

  return `
  <div class="page page--padded">
    <div class="page-texture"></div>
    ${pgHeader(logoUrl, 'Resumen Ejecutivo', 2)}

    <div class="kpi-row">
      <div class="kpi-card"><div class="kpi-card-val">${stats.viasIntervenidas}</div><div class="kpi-card-lbl">Tramos intervenidos</div></div>
      <div class="kpi-card"><div class="kpi-card-val">${Number(stats.longitudTotal).toFixed(1)}</div><div class="kpi-card-lbl">Km totales</div></div>
      <div class="kpi-card"><div class="kpi-card-val">${stats.municipios}</div><div class="kpi-card-lbl">Municipios</div></div>
      <div class="kpi-card"><div class="kpi-card-val">${stats.circuitos}</div><div class="kpi-card-lbl">Circuitos</div></div>
    </div>

    <div class="tbl-wrap">
      <table class="rpt-tbl">
        <thead><tr>
          <th style="width:24px">#</th>
          <th class="td-left" style="min-width:110px">Tramo</th>
          <th class="td-left">Municipio</th>
          <th class="td-left">Subregión</th>
          <th>Circuito</th>
          <th>Km</th>
          <th style="min-width:64px">Av. Físico</th>
          <th style="min-width:64px">Av. Financiero</th>
          <th class="td-left" style="min-width:90px">Contratista</th>
          <th>Plazo</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${pgFooter(fecha)}
  </div>`
}

function buildCurvaSPage(logoUrl, fecha, cd, pageNum) {
  const rows = cd.curva_s ?? []
  if (!rows.length) return ''

  const MESES = { Ene:0,Feb:1,Mar:2,Abr:3,May:4,Jun:5,Jul:6,Ago:7,Sep:8,Oct:9,Nov:10,Dic:11 }
  const hoy = new Date()
  let todayIdx = rows.length - 1
  for (let i = 0; i < rows.length; i++) {
    const [mon, yr] = (rows[i].periodo ?? '').split('-')
    if (new Date(+yr, MESES[mon] ?? 0, 15) >= hoy) { todayIdx = i; break }
  }

  const chart = svgLineChart({
    labels: rows.map(r => r.periodo), yMax: 100, yTicks: 4, yFmt: v => v + '%', todayIdx,
    datasets: [
      { label:'% Inv. Acum. Programado', data: rows.map(r => r.inv_acum_prog), color:'#0b5640', width:2.5, dotR:3 },
      { label:'% Fís. Acum. Programado', data: rows.map(r => r.fis_acum_prog), color:'#3fad72', width:2, dash:'6,3' },
      { label:'% Inv. Acum. Real',       data: rows.map(r => r.inv_acum_real), color:'#b91c1c', width:2.5, dash:'5,3', dotR:4 },
      { label:'% Fís. Acum. Real',       data: rows.map(r => r.fis_acum_real), color:'#d97706', width:2.5, dash:'5,3', dotR:4 },
    ],
  })

  const last = rows[rows.length - 1]
  const trs = rows.map(r => `<tr>
    <td class="td-gray">${r.mes}</td>
    <td class="td-left td-bold">${esc(r.periodo)}</td>
    <td>${fmtP(r.inv_prog_mes)}</td>
    <td class="td-acum">${fmtP(r.inv_acum_prog)}</td>
    <td>${fmtP(r.fis_prog_mes)}</td>
    <td class="td-acum">${fmtP(r.fis_acum_prog)}</td>
    <td class="td-real">${r.inv_acum_real != null ? fmtP(r.inv_acum_real) : ''}</td>
    <td class="td-real">${r.fis_acum_real != null ? fmtP(r.fis_acum_real) : ''}</td>
    <td style="text-align:right;font-size:7pt">${fmtC(r.valor_acum_prog)}</td>
    <td class="td-left" style="font-size:7pt;white-space:normal;max-width:120px">${esc(r.observacion ?? '')}</td>
  </tr>`).join('')

  return `
  <div class="page page--padded">
    <div class="page-texture"></div>
    ${pgHeader(logoUrl, 'Curva S — Inversión y Ejecución Física', pageNum)}

    <div class="sec-hero">
      <div class="sec-hero-num">01</div>
      <div class="sec-hero-content">
        <div class="sec-hero-label">Análisis de inversión</div>
        <div class="sec-hero-title">Curva S — ${esc(cd.circuito?.toUpperCase() ?? '')}</div>
        <div class="sec-hero-meta">Inicio: ${esc(cd.fecha_inicio ?? '—')} &nbsp;·&nbsp; Plazo: ${cd.plazo_meses ?? '—'} meses &nbsp;·&nbsp; Contratista: ${esc(cd.contratista ?? '—')}</div>
      </div>
    </div>

    <div class="three-col" style="margin-bottom:10px">
      <div class="kpi-card"><div class="kpi-card-val" style="font-size:14pt">${fmtCM(cd.valor_contrato)}</div><div class="kpi-card-lbl">Valor contrato</div></div>
      <div class="kpi-card"><div class="kpi-card-val" style="font-size:14pt;color:#d97706">${fmtP(last?.inv_acum_real)}</div><div class="kpi-card-lbl">Inversión real acum.</div></div>
      <div class="kpi-card"><div class="kpi-card-val" style="font-size:14pt;color:#d97706">${fmtP(last?.fis_acum_real)}</div><div class="kpi-card-lbl">Físico real acum.</div></div>
    </div>

    <div class="chart-box">${chart}</div>

    <div class="tbl-wrap">
      <table class="rpt-tbl">
        <thead>
          <tr>
            <th rowspan="2" style="width:26px">Mes</th>
            <th rowspan="2" class="td-left">Período</th>
            <th colspan="2" style="background:#1a7a56">Inversión Programada</th>
            <th colspan="2" style="background:#1a7a56">Físico Programado</th>
            <th colspan="2" class="th-real">Real (ingreso manual)</th>
            <th rowspan="2">Valor Acum. Prog.</th>
            <th rowspan="2" class="td-left">Observaciones</th>
          </tr>
          <tr>
            <th class="th-sub-base">% Mes</th><th class="th-sub-base">% Acum.</th>
            <th class="th-sub-base">% Mes</th><th class="th-sub-base">% Acum.</th>
            <th class="th-sub-real">% Inv.</th><th class="th-sub-real">% Fís.</th>
          </tr>
        </thead>
        <tbody>${trs}</tbody>
        <tfoot><tr class="tr-total">
          <td colspan="2" class="td-left">TOTAL / FINAL</td>
          <td>—</td><td class="td-acum">${fmtP(last?.inv_acum_prog)}</td>
          <td>—</td><td class="td-acum">${fmtP(last?.fis_acum_prog)}</td>
          <td class="td-real">${last?.inv_acum_real != null ? fmtP(last.inv_acum_real) : ''}</td>
          <td class="td-real">${last?.fis_acum_real != null ? fmtP(last.fis_acum_real) : ''}</td>
          <td style="text-align:right">${fmtC(last?.valor_acum_prog)}</td>
          <td></td>
        </tr></tfoot>
      </table>
    </div>
    ${pgFooter(fecha)}
  </div>`
}

function buildValorGanadoPage(logoUrl, fecha, cd, pageNum) {
  const vg  = cd.valor_ganado ?? []
  const BAC = cd.bac_evm ?? cd.valor_contrato ?? 0
  if (!vg.length) return ''

  const pvV = vg.map(r => r.pv_acum), evV = vg.map(r => r.ev_acum), acV = vg.map(r => r.ac_acum)
  const allV = [...pvV, ...evV, ...acV].filter(v => v != null)
  const yMaxVG = Math.ceil(Math.max(BAC, allV.length ? Math.max(...allV) : BAC) / 1e9) * 1e9 || 1e9
  const yFmtVG = v => v >= 1e9 ? `$${(v/1e9).toFixed(1)}B` : `$${(v/1e6).toFixed(0)}M`

  const chart = svgLineChart({
    labels: vg.map(r => r.periodo), yMax: yMaxVG, yTicks: 4, yFmt: yFmtVG,
    datasets: [
      { label:'PV — Valor Planificado', data: pvV, color:'#0b5640', width:2.5, dotR:3 },
      { label:'EV — Valor Ganado',      data: evV, color:'#3fad72', width:2.5, dash:'6,3', dotR:4 },
      { label:'AC — Costo Real',        data: acV, color:'#b91c1c', width:2.5, dash:'4,4', dotR:4 },
    ],
  })

  const rows = vg.map((r, i) => {
    const pv = r.pv_acum, ev = r.ev_acum, ac = r.ac_acum
    const sv  = ev != null && pv != null ? ev - pv : null
    const cv  = ev != null && ac != null ? ev - ac : null
    const spi = ev != null && pv > 0 ? ev / pv : null
    const cpi = ev != null && ac > 0 ? ev / ac : null
    const eac = cpi > 0 ? BAC / cpi : null
    const etc = eac != null && ac != null ? eac - ac : null
    const vac = eac != null ? BAC - eac : null
    const clsSpi = spi == null ? '' : spi >= 1 ? 'td-ok' : spi >= 0.85 ? 'td-warn' : 'td-bad'
    const clsCpi = cpi == null ? '' : cpi >= 1 ? 'td-ok' : cpi >= 0.85 ? 'td-warn' : 'td-bad'
    const clsSv  = sv  == null ? '' : sv  >= 0 ? 'td-ok' : 'td-bad'
    const clsCv  = cv  == null ? '' : cv  >= 0 ? 'td-ok' : 'td-bad'
    let est = '', estCls = ''
    if (ev != null && pv != null) {
      if (spi >= 1) { est = '▲ ADELANTADO'; estCls = 'badge badge-ok' }
      else if (spi >= 0.85) { est = '⚠ ATRASADO'; estCls = 'badge badge-warn' }
      else { est = '⚠ ATRASADO'; estCls = 'badge badge-bad' }
    }
    return `<tr>
      <td class="td-gray">${r.mes}</td>
      <td class="td-left td-bold">${esc(r.periodo)}</td>
      <td style="background:#f0fdf4;font-size:7pt">${fmtC(pv)}</td>
      <td class="td-real">${ev != null ? fmtC(ev) : ''}</td>
      <td class="td-real">${ac != null ? fmtC(ac) : ''}</td>
      <td class="${clsSv}" style="font-size:7pt">${sv != null ? fmtC(sv) : '—'}</td>
      <td class="${clsCv}" style="font-size:7pt">${cv != null ? fmtC(cv) : '—'}</td>
      <td class="${clsSpi} td-bold">${fmtI(spi)}</td>
      <td class="${clsCpi} td-bold">${fmtI(cpi)}</td>
      <td class="td-proy">${eac != null ? fmtC(eac) : ''}</td>
      <td class="td-proy">${etc != null ? fmtC(etc) : ''}</td>
      <td class="td-proy">${vac != null ? fmtC(vac) : ''}</td>
      <td>${est ? `<span class="${estCls}">${esc(est)}</span>` : ''}</td>
    </tr>`
  }).join('')

  const last = vg.filter(r => r.ev_acum != null).at(-1)
  const lPv = last?.pv_acum, lEv = last?.ev_acum, lAc = last?.ac_acum
  const lSpi = lEv && lPv > 0 ? lEv/lPv : null
  const lCpi = lEv && lAc > 0 ? lEv/lAc : null
  const lEac = lCpi > 0 ? BAC/lCpi : null
  const lEtc = lEac != null && lAc != null ? lEac - lAc : null
  const lVac = lEac != null ? BAC - lEac : null
  const lSv  = lEv != null && lPv != null ? lEv - lPv : null
  const lCv  = lEv != null && lAc != null ? lEv - lAc : null

  return `
  <div class="page page--padded">
    <div class="page-texture"></div>
    ${pgHeader(logoUrl, 'Valor Ganado (EVM)', pageNum)}

    <div class="sec-hero">
      <div class="sec-hero-num">02</div>
      <div class="sec-hero-content">
        <div class="sec-hero-label">Gestión del valor ganado</div>
        <div class="sec-hero-title">EVM — ${esc(cd.circuito?.toUpperCase() ?? '')}</div>
        <div class="sec-hero-meta">BAC = ${fmtC(BAC)} &nbsp;·&nbsp; Contrato: ${esc(cd.contrato ?? '—')} &nbsp;·&nbsp; Plazo: ${cd.plazo_meses ?? '—'} meses</div>
      </div>
    </div>

    <div class="three-col" style="margin-bottom:10px">
      <div class="kpi-card">
        <div class="kpi-card-val" style="font-size:14pt;color:${lSpi != null ? (lSpi>=1?'#0b5640':lSpi>=0.85?'#d97706':'#b91c1c') : '#0b5640'}">${fmtI(lSpi)}</div>
        <div class="kpi-card-lbl">SPI (EV/PV)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-card-val" style="font-size:14pt;color:${lCpi != null ? (lCpi>=1?'#0b5640':lCpi>=0.85?'#d97706':'#b91c1c') : '#0b5640'}">${fmtI(lCpi)}</div>
        <div class="kpi-card-lbl">CPI (EV/AC)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-card-val" style="font-size:13pt;color:#1d4ed8">${fmtCM(lEac)}</div>
        <div class="kpi-card-lbl">EAC (estimado al completar)</div>
      </div>
    </div>

    <div class="chart-box">${chart}</div>

    <div class="sec-note">PV=Val.Planificado &nbsp;·&nbsp; EV=Val.Ganado &nbsp;·&nbsp; AC=Costo Real &nbsp;·&nbsp; SV=EV–PV &nbsp;·&nbsp; CV=EV–AC &nbsp;·&nbsp; EAC=BAC/CPI &nbsp;·&nbsp; ETC=EAC–AC &nbsp;·&nbsp; VAC=BAC–EAC &nbsp;·&nbsp; 🟡 Datos de ingreso manual</div>

    <div class="tbl-wrap">
      <table class="rpt-tbl">
        <thead>
          <tr>
            <th rowspan="2" style="width:26px">Mes</th>
            <th rowspan="2" class="td-left">Período</th>
            <th rowspan="2" style="background:#0b5640">PV Acum.</th>
            <th colspan="2" class="th-real">REAL</th>
            <th colspan="2" class="th-var">VARIACIONES</th>
            <th colspan="2" class="th-idx">ÍNDICES</th>
            <th colspan="3" class="th-proy">PROYECCIONES</th>
            <th rowspan="2" style="background:#374151">Estado</th>
          </tr>
          <tr>
            <th class="th-sub-real">EV</th><th class="th-sub-real">AC</th>
            <th class="th-sub-var">SV</th><th class="th-sub-var">CV</th>
            <th class="th-sub-idx">SPI</th><th class="th-sub-idx">CPI</th>
            <th class="th-sub-proy">EAC</th><th class="th-sub-proy">ETC</th><th class="th-sub-proy">VAC</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="tr-total">
          <td colspan="2" class="td-left">RESUMEN FINAL</td>
          <td style="background:rgba(255,255,255,.1)">${fmtC(vg.at(-1)?.pv_acum)}</td>
          <td class="td-real">${fmtC(lEv)}</td><td class="td-real">${fmtC(lAc)}</td>
          <td class="${lSv!=null?(lSv>=0?'td-ok':'td-bad'):''}">${lSv!=null?fmtC(lSv):'—'}</td>
          <td class="${lCv!=null?(lCv>=0?'td-ok':'td-bad'):''}">${lCv!=null?fmtC(lCv):'—'}</td>
          <td class="${lSpi!=null?(lSpi>=1?'td-ok':lSpi>=.85?'td-warn':'td-bad'):''}">${fmtI(lSpi)}</td>
          <td class="${lCpi!=null?(lCpi>=1?'td-ok':lCpi>=.85?'td-warn':'td-bad'):''}">${fmtI(lCpi)}</td>
          <td class="td-proy">${fmtC(lEac)}</td><td class="td-proy">${fmtC(lEtc)}</td><td class="td-proy">${fmtC(lVac)}</td>
          <td></td>
        </tr></tfoot>
      </table>
    </div>
    ${pgFooter(fecha)}
  </div>`
}

function buildMRPage(logoUrl, fecha, cd, pageNum) {
  const mr  = cd.modulo_resiliente
  const est = mr?.estaciones ?? []
  if (!est.length) return ''

  const cond = v => {
    if (v == null) return { label:'—', cls:'' }
    if (v >= 200)  return { label:'✓ BUENA',     cls:'badge badge-ok'   }
    if (v >= 100)  return { label:'⚠ REGULAR',   cls:'badge badge-warn' }
    return             { label:'✗ DEFICIENTE', cls:'badge badge-bad'  }
  }

  const trs = est.map(e => {
    const proy  = e.mr_proyectado ?? e.mr_disenho
    const delta = e.mr_medido != null && proy != null ? e.mr_medido - proy : null
    const ratio = e.mr_medido != null && proy > 0 ? (e.mr_medido / proy * 100) : null
    const c     = cond(e.mr_medido)
    return `<tr>
      <td class="td-mono">${esc(e.abscisa)}</td>
      <td class="td-bold" style="font-size:11pt;color:#6d28d9">${fmtN(e.mr_medido)}</td>
      <td style="color:#b91c1c;font-weight:700">${fmtN(proy)}</td>
      <td class="${delta!=null?(delta>=0?'td-ok':'td-bad'):''}">${delta!=null?(delta>=0?'+':'')+fmtN(delta):'—'}</td>
      <td>${ratio!=null?ratio.toFixed(1)+'%':'—'}</td>
      <td><span class="${c.cls}">${c.label}</span></td>
      <td class="td-left" style="font-size:7pt;white-space:normal;max-width:140px">${esc(e.observacion ?? '')}</td>
    </tr>`
  }).join('')

  const okN   = est.filter(e => e.mr_medido >= 200).length
  const warnN = est.filter(e => e.mr_medido >= 100 && e.mr_medido < 200).length
  const badN  = est.filter(e => e.mr_medido < 100).length

  return `
  <div class="page page--padded">
    <div class="page-texture"></div>
    ${pgHeader(logoUrl, 'Módulo Resiliente (Mr)', pageNum)}

    <div class="sec-hero">
      <div class="sec-hero-num">03</div>
      <div class="sec-hero-content">
        <div class="sec-hero-label">Capacidad estructural de la vía</div>
        <div class="sec-hero-title">Módulo Resiliente — ${esc(cd.circuito?.toUpperCase() ?? '')}</div>
        <div class="sec-hero-meta">Norma: ${esc(mr.norma ?? '—')} &nbsp;·&nbsp; Umbral BUENA: ≥ 200 MPa &nbsp;·&nbsp; REGULAR: 100–199 MPa &nbsp;·&nbsp; DEFICIENTE: &lt; 100 MPa</div>
      </div>
    </div>

    <div class="three-col" style="margin-bottom:10px">
      <div class="kpi-card" style="border-color:#bbf7d0">
        <div class="kpi-card-val" style="color:#065f46">${okN}</div>
        <div class="kpi-card-lbl">✓ Buena (≥ 200 MPa)</div>
      </div>
      <div class="kpi-card" style="border-color:#fde68a;background:#fefce8">
        <div class="kpi-card-val" style="color:#92400e">${warnN}</div>
        <div class="kpi-card-lbl">⚠ Regular (100–199)</div>
      </div>
      <div class="kpi-card" style="border-color:#fecaca;background:#fff1f2">
        <div class="kpi-card-val" style="color:#991b1b">${badN}</div>
        <div class="kpi-card-lbl">✗ Deficiente (&lt; 100)</div>
      </div>
    </div>

    <div class="chart-box">${svgMrChart(est)}</div>

    <div class="tbl-wrap">
      <table class="rpt-tbl">
        <thead><tr>
          <th class="td-left">Abscisa (km+m)</th>
          <th style="background:#7c3aed">Mr Medido (MPa)</th>
          <th style="background:#b91c1c">Mr Proyectado (MPa)</th>
          <th>ΔMr (MPa)</th>
          <th>Med/Proy</th>
          <th>Condición</th>
          <th class="td-left">Observaciones</th>
        </tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>
    ${pgFooter(fecha)}
  </div>`
}

function buildEnsayosPage(logoUrl, fecha, cd, pageNum) {
  const puntos = cd.ensayos_matricial ?? []
  if (!puntos.length) return ''

  const ETAPA1 = [
    {key:'e1_e142',label:'PROC',norma:'E-142'},{key:'e1_e148i',label:'CBR-I',norma:'E-148'},
    {key:'e1_e148c',label:'CBR-C',norma:'E-148'},{key:'e1_e172',label:'DCP',norma:'E-172'},
  ]
  const ETAPA2 = [
    {key:'e2_e213',label:'GRAN',norma:'E-213'},{key:'e2_e125126',label:'LL-LP',norma:'E-125/126'},
    {key:'e2_e122',label:'HUM',norma:'E-122'},{key:'e2_une103204',label:'ORG',norma:'UNE103204'},
    {key:'e2_e133',label:'EA',norma:'E-133'},{key:'e2_e235',label:'AZM',norma:'E-235'},
    {key:'e2_une103201',label:'SAL',norma:'UNE103201'},{key:'e2_e132',label:'EXP',norma:'E-132'},
  ]
  const ETAPA3 = [
    {key:'e3_e142',label:'PROC',norma:'E-142'},{key:'e3_e148',label:'CBR',norma:'E-148'},
    {key:'e3_e601',label:'PH',norma:'E-601'},{key:'e3_e414613',label:'FLEX',norma:'E-414/613'},
    {key:'e3_e613614',label:'DSC',norma:'E-613/614'},
  ]
  const ALL = [...ETAPA1, ...ETAPA2, ...ETAPA3]

  const hE1 = ETAPA1.map(c => `<th class="th-e1" style="font-size:5.5pt;padding:3px 4px">${c.label}<br><span style="opacity:.7">${c.norma}</span></th>`).join('')
  const hE2 = ETAPA2.map(c => `<th class="th-e2" style="font-size:5.5pt;padding:3px 4px">${c.label}<br><span style="opacity:.7">${c.norma}</span></th>`).join('')
  const hE3 = ETAPA3.map(c => `<th class="th-e3" style="font-size:5.5pt;padding:3px 4px">${c.label}<br><span style="opacity:.7">${c.norma}</span></th>`).join('')

  const trs = puntos.map(p => {
    const done = ALL.filter(c => p[c.key]?.fecha).length
    const pct  = Math.round(done / ALL.length * 100)
    const pctCls = pct === 100 ? 'badge badge-ok' : pct > 0 ? 'badge badge-warn' : 'badge'
    const cells = ALL.map(c => {
      const v = p[c.key]
      return v?.fecha
        ? `<td class="cell-done"><span class="cell-fecha">${esc(v.fecha)}</span>${v.valor!=null?`<span class="cell-val">${esc(v.valor)}</span>`:''}</td>`
        : `<td></td>`
    }).join('')
    return `<tr>
      <td class="td-mono" style="font-size:6.5pt">${esc(p.abscisa)}</td>
      <td style="font-size:6pt;color:#6b7280">${esc(p.etapa ?? '')}</td>
      <td style="font-size:6pt">${esc(p.tramo ?? '')}</td>
      ${cells}
      <td><span class="${pctCls}" style="font-size:6.5pt">${pct}%</span></td>
    </tr>`
  }).join('')

  return `
  <div class="page page--padded" style="padding:10mm 8mm">
    <div class="page-texture"></div>
    ${pgHeader(logoUrl, 'Check List — Ensayos de Laboratorio', pageNum)}

    <div class="sec-hero" style="margin-bottom:10px">
      <div class="sec-hero-num">04</div>
      <div class="sec-hero-content">
        <div class="sec-hero-label">Control de calidad de materiales</div>
        <div class="sec-hero-title">Ensayos Matricial — ${esc(cd.circuito?.toUpperCase() ?? '')}</div>
        <div class="sec-hero-meta">CCE-EICP-IDI-01 v4 &nbsp;·&nbsp; Contratista: ${esc(cd.contratista ?? '—')} &nbsp;·&nbsp; Contrato: ${esc(cd.contrato ?? '—')}</div>
      </div>
    </div>

    <div class="tbl-wrap">
      <table class="rpt-tbl" style="font-size:6.5pt">
        <thead>
          <tr>
            <th rowspan="2" class="td-left" style="min-width:60px;padding:4px 6px">Abscisa</th>
            <th rowspan="2" style="min-width:36px">Etapa</th>
            <th rowspan="2" style="min-width:48px">Tramo</th>
            <th colspan="${ETAPA1.length}" class="th-e1">Etapa 1 — Apiques (c/250m)</th>
            <th colspan="${ETAPA2.length}" class="th-e2">Etapa 2 — Granulares Superficiales (0–40cm)</th>
            <th colspan="${ETAPA3.length}" class="th-e3">Etapa 3 — Fórmula de Trabajo</th>
            <th rowspan="2" style="background:#374151;min-width:36px">%</th>
          </tr>
          <tr>${hE1}${hE2}${hE3}</tr>
        </thead>
        <tbody>${trs}</tbody>
      </table>
    </div>
    ${pgFooter(fecha)}
  </div>`
}

// ── Shared builder ───────────────────────────────────────────────────────────

export function buildReportePages(stats, filters, logoUrl, fecha, geoFeatures = []) {
  const hasCircuito = filters.circuito && filters.circuito !== 'Todos los circuitos'
  const hasMunicipio = filters.municipio && filters.municipio !== 'Todos los municipios'
  const cd = hasCircuito
    ? (cronogramasData.circuitos.find(c => norm(c.circuito) === norm(filters.circuito)) ?? null)
    : null

  // ── Reporte por circuito (detallado con Curva S, EVM, MR, Ensayos) ──────────
  if (hasCircuito) {
    const hasCurvaS  = !!(cd?.curva_s?.length)
    const hasEVM     = !!(cd?.valor_ganado?.length)
    const hasMR      = !!(cd?.modulo_resiliente?.estaciones?.length)
    const hasEnsayos = !!(cd?.ensayos_matricial?.length)

    let p = 3
    const tocEntries = [
      { name: 'Resumen Ejecutivo', sub: 'Tramos intervenidos, avance físico y financiero', pg: p, color: '#0b5640' },
    ]
    if (hasCurvaS)  { p += 2; tocEntries.push({ name: 'Curva S',               sub: 'Inversión y ejecución física programada vs. real', pg: p, color: '#1a7a56' }) }
    if (hasEVM)     { p += 2; tocEntries.push({ name: 'Valor Ganado (EVM)',     sub: 'SPI, CPI, EAC y proyecciones de costo',           pg: p, color: '#1d4ed8' }) }
    if (hasMR)      { p += 2; tocEntries.push({ name: 'Módulo Resiliente',      sub: 'Capacidad estructural medida vs. proyectada',      pg: p, color: '#6d28d9' }) }
    if (hasEnsayos) { p += 2; tocEntries.push({ name: 'Ensayos de Laboratorio', sub: 'Check list matricial CCE-EICP-IDI-01 v4',         pg: p, color: '#b45309' }) }

    const pages = [
      { html: buildCover(logoUrl, fecha, filters, stats), section: 'Portada'          },
      { html: buildTOCPage(logoUrl, fecha, tocEntries),   section: 'Contenido'         },
      { html: buildResumenPage(logoUrl, fecha, stats),    section: 'Resumen Ejecutivo' },
    ]

    if (cd) {
      const pgCurva = tocEntries.find(e => e.name === 'Curva S')?.pg
      const pgEVM   = tocEntries.find(e => e.name === 'Valor Ganado (EVM)')?.pg
      const pgMR    = tocEntries.find(e => e.name === 'Módulo Resiliente')?.pg
      const pgEns   = tocEntries.find(e => e.name === 'Ensayos de Laboratorio')?.pg

      if (hasCurvaS) {
        pages.push({ html: buildSectionSplash('01', 'Curva S', 'Análisis de inversión y ejecución física programada vs. real', 'linear-gradient(155deg,#021a0e 0%,#052318 35%,#0b5640 70%,#1a7a56 100%)', '#3fad72'), section: '' })
        pages.push({ html: buildCurvaSPage(logoUrl, fecha, cd, pgCurva), section: 'Curva S' })
      }
      if (hasEVM) {
        pages.push({ html: buildSectionSplash('02', 'Valor Ganado', 'Gestión del valor ganado — EVM, SPI, CPI y proyecciones EAC', 'linear-gradient(155deg,#0f0c29 0%,#1e1b4b 40%,#1d4ed8 100%)', '#93c5fd'), section: '' })
        pages.push({ html: buildValorGanadoPage(logoUrl, fecha, cd, pgEVM), section: 'Valor Ganado' })
      }
      if (hasMR) {
        const mrHtml = buildMRPage(logoUrl, fecha, cd, pgMR)
        if (mrHtml) {
          pages.push({ html: buildSectionSplash('03', 'Módulo Resiliente', 'Capacidad estructural medida vs. proyectada por abscisa', 'linear-gradient(155deg,#1a0535 0%,#2d1b69 40%,#6d28d9 100%)', '#c4b5fd'), section: '' })
          pages.push({ html: mrHtml, section: 'Módulo Resiliente' })
        }
      }
      if (hasEnsayos) {
        const enHtml = buildEnsayosPage(logoUrl, fecha, cd, pgEns)
        if (enHtml) {
          pages.push({ html: buildSectionSplash('04', 'Ensayos de Laboratorio', 'Control de calidad de materiales — CCE-EICP-IDI-01 v4', 'linear-gradient(155deg,#1c0a03 0%,#451a03 40%,#92400e 100%)', '#fcd34d'), section: '' })
          pages.push({ html: enHtml, section: 'Ensayos' })
        }
      }
    }
    return pages
  }

  // ── Reporte por municipio ────────────────────────────────────────────────────
  if (hasMunicipio) {
    const viasDetalle = stats.viasDetalle ?? []
    return [
      { html: buildCover(logoUrl, fecha, filters, stats),                                               section: 'Portada'         },
      { html: buildMunicipioDetailPage(filters.municipio, viasDetalle, logoUrl, fecha, 2, geoFeatures), section: filters.municipio },
    ]
  }

  // ── Reporte general por subregión ────────────────────────────────────────────
  const viasDetalle = stats.viasDetalle ?? []
  const subregionMap = {}
  for (const v of viasDetalle) {
    const sub = v.subregion || 'Sin subregión'
    if (!subregionMap[sub]) subregionMap[sub] = []
    subregionMap[sub].push(v)
  }
  const subregiones = Object.keys(subregionMap).sort((a, b) => a.localeCompare(b, 'es'))

  // cover=1, toc=2, resumen=3, luego splash+detail por cada subregión
  let p = 3
  const tocEntries = [
    { name: 'Resumen General', sub: 'KPIs y cuadro comparativo por subregión', pg: p, color: '#0b5640' },
  ]
  subregiones.forEach(sub => {
    p++
    tocEntries.push({
      name:  sub,
      sub:   `${new Set(subregionMap[sub].map(v => v.circuito || v.nombre)).size} circuitos · ${subregionMap[sub].reduce((s, v) => s + (v.km ?? 0), 0).toFixed(0)} km`,
      pg:    p,
      color: getSubregionPalette(sub).accent,
    })
    p++
  })

  const pages = [
    { html: buildCover(logoUrl, fecha, filters, stats),                               section: 'Portada'        },
    { html: buildTOCPage(logoUrl, fecha, tocEntries),                                 section: 'Contenido'      },
    { html: buildGlobalResumenPage(logoUrl, fecha, stats, subregionMap, subregiones), section: 'Resumen General' },
  ]

  subregiones.forEach((sub, i) => {
    const palette  = getSubregionPalette(sub)
    const secNum   = String(i + 1).padStart(2, '0')
    const splashPg = tocEntries.find(e => e.name === sub)?.pg ?? (4 + i * 2)
    pages.push({ html: buildSubregionSplash(sub, subregionMap[sub], logoUrl, splashPg, secNum, palette, geoFeatures), section: ''  })
    pages.push({ html: buildSubregionDetailPage(sub, subregionMap[sub], logoUrl, fecha, splashPg + 1, secNum, palette),   section: sub })
  })

  return pages
}

export { CSS }

// ── Entry point ──────────────────────────────────────────────────────────────
export function useReporte() {
  function generarReporte(filteredStats, activeFilters, geoFeatures = []) {
    const filters  = activeFilters?.value ?? activeFilters
    const stats    = filteredStats?.value  ?? filteredStats
    const features = Array.isArray(geoFeatures) ? geoFeatures : (geoFeatures?.value ?? [])

    const logoUrl = window.location.origin + '/Escudo%20de%20armas.png'
    const fecha   = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

    const pagesMeta = buildReportePages(stats, filters, logoUrl, fecha, features)
    const pagesHtml = pagesMeta.map(p => p.html).join('\n')
    const today     = new Date().toISOString().slice(0, 10)

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte Gerencial SIMEVA — ${today}</title>
<style>
${CSS}
/* ── Print toolbar ── */
.print-bar {
  position:fixed;top:0;left:0;right:0;height:50px;
  background:linear-gradient(90deg,#052318,#0b5640);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 20px;z-index:9999;
  font-family:'Prompt',sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.3);
}
.print-bar-title { color:#fff;font-size:13px;font-weight:700;letter-spacing:.05em }
.print-bar-date  { color:rgba(255,255,255,.6);font-size:11px }
.print-bar-btn {
  display:inline-flex;align-items:center;gap:8px;
  background:#3fad72;color:#fff;border:none;
  font-family:'Prompt',sans-serif;font-size:12px;font-weight:700;
  padding:8px 20px;border-radius:8px;cursor:pointer;
  transition:background .15s;
}
.print-bar-btn:hover { background:#34c77a }
.print-bar-btn svg { width:16px;height:16px }
@media print { .print-bar { display:none!important } body { padding-top:0!important } }
</style>
</head>
<body style="padding-top:50px">
  <div class="print-bar no-print">
    <span class="print-bar-title">Reporte Gerencial SIMEVA</span>
    <span class="print-bar-date">${fecha}</span>
    <button class="print-bar-btn" onclick="window.print()">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M5 7V3h10v4M5 15H3a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2M5 11h10v6H5z"/>
      </svg>
      Imprimir / Guardar PDF
    </button>
  </div>
  ${pagesHtml}
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) { alert('Permite ventanas emergentes para generar el reporte.'); return }
    win.document.write(html)
    win.document.close()
  }

  return { generarReporte }
}
