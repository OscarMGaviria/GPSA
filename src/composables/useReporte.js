import cronogramasData from '../data/cronogramas.json'
import hitosData from '../data/hitos.json'
import { circuitPhotoUrl } from './useCircuitoPhotos.js'

const allLocalPhotos = import.meta.glob('/public/images/circuitos/**/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' })

const norm = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
const fmtP = v => v != null ? Number(v).toFixed(2) + '%' : '—'
const fmtC = v => v != null ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v) : '—'
const fmtCM = v => v != null ? (v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${(v / 1e6).toFixed(0)}M`) : '—'
const fmtI = v => v != null ? Number(v).toFixed(2) : '—'
const fmtN = v => v != null ? Number(v).toFixed(1) : '—'
const esc = s => (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

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

/* ══════════════════════════════════════════
   DIAPOSITIVAS — PRESENTACIÓN 16:9 (1280×720)
══════════════════════════════════════════ */
.ppt-slide {
  width:1280px;height:720px;
  position:relative;overflow:hidden;
  font-family:'Prompt',sans-serif;box-sizing:border-box;
}
.ppt-cover { display:flex;flex-direction:column }
.ppt-cover-top {
  flex:0 0 42%;background:#f4f5f0;
  display:flex;align-items:center;justify-content:center;
  position:relative;overflow:hidden;
}
.ppt-cover-top::before {
  content:'';position:absolute;inset:0;
  background:repeating-linear-gradient(135deg,transparent,transparent 48px,rgba(0,0,0,.025) 48px,rgba(0,0,0,.025) 49px);
}
.ppt-cover-top-inner { position:relative;z-index:1;text-align:center;padding:0 80px }
.ppt-cover-supertitle { font-size:13px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#9ca3af;margin-bottom:14px }
.ppt-cover-title { font-size:56px;font-weight:900;color:#0b5640;line-height:1.05;letter-spacing:-.02em;white-space:pre-line }
.ppt-cover-divider { width:64px;height:4px;background:#0b5640;border-radius:2px;margin:18px auto 14px }
.ppt-cover-date { font-size:14px;color:#9ca3af;font-weight:300 }
.ppt-cover-bottom {
  flex:0 0 58%;background:#0b5640;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 72px;position:relative;overflow:hidden;
}
.ppt-cover-bottom::before {
  content:'';position:absolute;inset:0;
  background:repeating-linear-gradient(135deg,transparent,transparent 48px,rgba(255,255,255,.025) 48px,rgba(255,255,255,.025) 49px);
}
.ppt-cover-kpis { display:flex;gap:20px;position:relative;z-index:1 }
.ppt-cover-kpi { background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:12px;padding:14px 22px;text-align:center;min-width:88px }
.ppt-cover-kpi-val { font-size:30px;font-weight:900;color:#fff;line-height:1 }
.ppt-cover-kpi-lbl { font-size:10px;color:rgba(255,255,255,.55);font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-top:5px }
.ppt-cover-logo-wrap { display:flex;align-items:center;gap:18px;position:relative;z-index:1 }
.ppt-cover-logo-block { display:flex;align-items:center;gap:18px;position:relative;z-index:1 }
.ppt-cover-logo-img { width:78px;height:78px;object-fit:contain }
.ppt-cover-org { font-size:18px;font-weight:900;color:#fff;letter-spacing:.05em }
.ppt-cover-org-sub { font-size:13px;color:rgba(255,255,255,.55);margin-top:3px }
.ppt-content-slide { background:#fff;display:flex;flex-direction:column }
.ppt-header { display:flex;align-items:center;justify-content:space-between;padding:16px 44px 14px;border-bottom:2px solid #f0f0ef;flex-shrink:0 }
.ppt-header-title { font-size:20px;font-weight:800;color:#0b5640;line-height:1.2;max-width:680px }
.ppt-header-logo { display:flex;align-items:center;gap:11px;flex-shrink:0 }
.ppt-header-logo-img { width:44px;height:44px;object-fit:contain }
.ppt-header-logo-text { font-size:11px;color:#374151;line-height:1.5 }
.ppt-header-logo-text strong { color:#0b5640;font-weight:800 }
.ppt-body { flex:1;padding:16px 44px 10px;overflow:hidden;min-height:0 }
.ppt-footer-bar { height:18px;background:#0b5640;flex-shrink:0 }
.ppt-kpi-row { display:flex;gap:14px;margin-bottom:18px }
.ppt-kpi { flex:1;background:#f0fdf4;border:1px solid #d1fae5;border-radius:10px;padding:13px 16px;position:relative;overflow:hidden }
.ppt-kpi::before { content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#0b5640;border-radius:3px 0 0 3px }
.ppt-kpi-val { font-size:28px;font-weight:900;color:#0b5640;line-height:1 }
.ppt-kpi-lbl { font-size:9px;color:#6b7280;margin-top:4px;font-weight:700;text-transform:uppercase;letter-spacing:.05em }
.ppt-two-col { display:grid;grid-template-columns:1fr 1fr;gap:24px }
.ppt-section-title { font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#9ca3af;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #f3f4f6 }
.ppt-sub-bars { display:flex;flex-direction:column;gap:7px }
.ppt-sub-row { display:flex;align-items:center;gap:10px }
.ppt-sub-name { font-size:11px;font-weight:700;color:#374151;min-width:128px;flex-shrink:0 }
.ppt-sub-bar-wrap { flex:1;height:10px;background:#f3f4f6;border-radius:5px;overflow:hidden }
.ppt-sub-bar { height:10px;border-radius:5px }
.ppt-sub-km { font-size:10px;font-weight:700;color:#6b7280;min-width:55px;text-align:right;flex-shrink:0 }
.ppt-circuit-kpis { display:flex;gap:14px;margin-bottom:10px }
.ppt-big-kpi { flex:1;background:#f9fafb;border-radius:10px;padding:13px 15px;border:1px solid #f3f4f6 }
.ppt-big-kpi-val { font-size:36px;font-weight:900;color:#111827;line-height:1 }
.ppt-big-kpi-lbl { font-size:9px;color:#9ca3af;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-top:5px }
.ppt-big-progress { height:4px;background:#e5e7eb;border-radius:2px;margin-top:10px;overflow:hidden }
.ppt-big-progress div { height:4px;border-radius:2px;min-width:2px }
.ppt-via-list { display:flex;flex-direction:column;gap:6px }
.ppt-via-row { display:flex;align-items:center;gap:8px }
.ppt-via-name { font-size:10px;color:#374151;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap }
.ppt-via-km { font-size:9px;color:#9ca3af;min-width:38px;text-align:right;flex-shrink:0 }
.ppt-via-bar-wrap { width:100px;height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden;flex-shrink:0 }
.ppt-via-bar-fill { height:8px;border-radius:4px;min-width:2px }
.ppt-via-pct { font-size:10px;font-weight:700;color:#374151;min-width:34px;text-align:right;flex-shrink:0 }
.ppt-info-grid { display:flex;flex-direction:column;gap:9px }
.ppt-info-item { background:#f9fafb;border-radius:8px;padding:9px 13px;border:1px solid #f3f4f6 }
.ppt-info-lbl { font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9ca3af;margin-bottom:3px }
.ppt-info-val { font-size:12px;font-weight:600;color:#374151 }
.ppt-placeholder { background:#f9fafb;border:1px dashed #d1d5db;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:11px;height:200px }
.ppt-photo-strip { display:flex;gap:6px;margin-top:10px }
.ppt-photo-item { flex:1;display:flex;flex-direction:column;align-items:center;gap:4px }
.ppt-photo-item img { width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb }
.ppt-photo-lbl { font-size:9px;font-weight:700;text-transform:uppercase;color:#9ca3af;letter-spacing:.08em }

/* Seguimiento slide header */
.seg-header {
  display:flex;align-items:flex-start;justify-content:space-between;
  padding:22px 36px 18px;
  background:rgba(255,255,255,0.82);
  backdrop-filter:blur(6px);
  border-bottom:3px solid rgba(11,86,64,0.15);
}
.seg-header-left { display:flex;flex-direction:column;gap:2px }
.seg-header-title { font-size:34px;font-weight:900;color:#0b5640;line-height:1.1;letter-spacing:-.01em;font-family:'Prompt',sans-serif }
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
  const n = estaciones.length
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
  'Bajo Cauca': { gradient: 'linear-gradient(155deg,#1a1203 0%,#422006 40%,#b45309 100%)', accent: '#fbbf24' },
  'Magdalena Medio': { gradient: 'linear-gradient(155deg,#1f1635 0%,#2d1b69 40%,#6d28d9 100%)', accent: '#c4b5fd' },
  'Nordeste': { gradient: 'linear-gradient(155deg,#042f2e 0%,#065f46 40%,#059669 100%)', accent: '#6ee7b7' },
  'Norte': { gradient: 'linear-gradient(155deg,#021a0e 0%,#052318 35%,#0b5640 100%)', accent: '#34d399' },
  'Occidente': { gradient: 'linear-gradient(155deg,#1c0a03 0%,#451a03 40%,#c2410c 100%)', accent: '#fb923c' },
  'Oriente': { gradient: 'linear-gradient(155deg,#0c1a2e 0%,#1e3a5f 40%,#1d4ed8 100%)', accent: '#60a5fa' },
  'Suroeste': { gradient: 'linear-gradient(155deg,#1f0317 0%,#500724 40%,#be123c 100%)', accent: '#fb7185' },
  'Urabá': { gradient: 'linear-gradient(155deg,#082f49 0%,#0c4a6e 40%,#0284c7 100%)', accent: '#38bdf8' },
  'Valle de Aburrá': { gradient: 'linear-gradient(155deg,#111827 0%,#1f2937 40%,#374151 100%)', accent: '#9ca3af' },
}

function getSubregionPalette(sub) {
  return SUBREGION_PALETTE[sub] ?? { gradient: 'linear-gradient(155deg,#111827 0%,#374151 100%)', accent: '#9ca3af' }
}

// Mapa SVG geográfico coloreado por avance (desde features GeoJSON MultiLineString)
function buildSVGMap(features, filterSubregion, palette, width = 290, height = 340, mpioFeatures = [], showMpios = false, filterCircuito = null) {
  if (!features?.length) return ''
  const normStr = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

  const filt = filterSubregion
    ? features.filter(f => normStr(f.properties?.SUBREGION) === normStr(filterSubregion))
    : features
  if (!filt.length) return ''

  // Bounding box
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const f of filt) {
    const geom = f.geometry
    if (!geom) continue
    const lines = geom.type === 'LineString' ? [geom.coordinates]
      : geom.type === 'MultiLineString' ? geom.coordinates
      : geom.type === 'Polygon' ? geom.coordinates
      : geom.type === 'MultiPolygon' ? geom.coordinates.flat()
      : []
    for (const line of lines) {
      for (const [lng, lat] of line) {
        if (lng < x0) x0 = lng; if (lng > x1) x1 = lng
        if (lat < y0) y0 = lat; if (lat > y1) y1 = lat
      }
    }
  }
  if (x0 === Infinity) return ''

  // Extend bbox to include municipality polygons so all munis are visible
  if (showMpios && mpioFeatures?.length) {
    for (const f of mpioFeatures) {
      const subnorm = normStr(f.properties?.SUBREGION ?? '')
      if (filterSubregion && subnorm !== normStr(filterSubregion)) continue
      const geom = f.geometry
      if (!geom) continue
      const rings = geom.type === 'Polygon' ? geom.coordinates
        : geom.type === 'MultiPolygon' ? geom.coordinates.flat() : []
      for (const ring of rings) {
        for (const [lng, lat] of ring) {
          if (lng < x0) x0 = lng; if (lng > x1) x1 = lng
          if (lat < y0) y0 = lat; if (lat > y1) y1 = lat
        }
      }
    }
  }

  const dx = x1 - x0 || 1
  let dy = y1 - y0 || 1

  // Cap aspect ratio to ≤1.7 to avoid extreme letterboxing on elongated subregions
  // (Urabá has dy/dx≈2.86; all others are ≤1.38)
  const MAX_RATIO = 1.7
  if (dy / dx > MAX_RATIO) {
    const excess = dy - dx * MAX_RATIO
    y0 += excess / 2
    y1 -= excess / 2
    dy = y1 - y0
  }

  if (height === null) height = Math.round(width * (dy / dx) * 1.15)

  const pad = 20
  const sc = Math.min((width - pad * 2) / dx, (height - pad * 2) / dy)
  const ox = pad + ((width - pad * 2) - dx * sc) / 2
  const oy = pad + ((height - pad * 2) - dy * sc) / 2
  const px = lng => (ox + (lng - x0) * sc).toFixed(1)
  const py = lat => (height - oy - (lat - y0) * sc).toFixed(1)

  // Municipios layer (background)
  let mpioPaths = ''
  let mpioLabels = ''
  if (showMpios && mpioFeatures?.length) {
    mpioPaths = mpioFeatures.map(f => {
      const subnorm = normStr(f.properties?.SUBREGION ?? '')
      if (filterSubregion && subnorm !== normStr(filterSubregion)) return ''
      const geom = f.geometry
      if (!geom) return ''
      const rings = geom.type === 'Polygon' ? geom.coordinates
        : geom.type === 'MultiPolygon' ? geom.coordinates.flat() : []
      
      let mx = Infinity, mX = -Infinity, my = Infinity, mY = -Infinity
      const d = rings.map(ring =>
        'M' + ring.map(([lng, lat]) => {
          if (lng < mx) mx = lng; if (lng > mX) mX = lng;
          if (lat < my) my = lat; if (lat > mY) mY = lat;
          return `${px(lng)},${py(lat)}`
        }).join(' L') + ' Z'
      ).join(' ')
      
      const name = f.properties?.MPIO_NOMBR || f.properties?.MPIO_CNMBR || ''
      if (palette.showLabels && name && mx !== Infinity) {
        const cx = px((mx + mX) / 2)
        const cy = py((my + mY) / 2)
        const fs = palette.labelSize ?? 7
        mpioLabels += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" fill="#1a5c3a" font-weight="700" font-family="sans-serif" opacity="0.95" pointer-events="none" paint-order="stroke" stroke="#fff" stroke-width="${fs * 0.45}" stroke-linejoin="round">${esc(name)}</text>`
      }
      
      return d ? `<path d="${d}" fill="rgba(52,211,153,0.22)" stroke="rgba(5,150,105,0.75)" stroke-width="1" data-msub="${subnorm}" opacity="0.9"/>` : ''
    }).join('')
  }

  // Circuit / via paths
  let buffers = ''
  const paths = filt.map(f => {
    const av      = parseFloat(f.properties?.AV_FISICO ?? 0)
    const subnorm = normStr(f.properties?.SUBREGION ?? '')
    const circ    = f.properties?.CIRCUITO ?? ''
    const highlighted = filterCircuito ? normStr(circ) === normStr(filterCircuito) : true

    const isLight = palette.lightBg
    const color   = highlighted
      ? (filterCircuito ? '#ea580c' : (av >= 0.8 ? (isLight ? '#10b981' : '#34d399') : av >= 0.4 ? palette.accent : av > 0 ? (isLight ? '#9ca3af' : 'rgba(255,255,255,0.6)') : palette.accent))
      : '#3b82f6'
    const sw      = highlighted ? (filterCircuito ? '5' : '2.4') : '1.8'
    const op      = highlighted ? '1' : '0.55'

    const geom = f.geometry
    if (!geom) return ''
    const lines = geom.type === 'LineString' ? [geom.coordinates]
      : geom.type === 'MultiLineString' ? geom.coordinates : []
    const d = lines.map(line =>
      'M' + line.map(([lng, lat]) => `${px(lng)},${py(lat)}`).join(' L')
    ).join(' ')
    
    if (highlighted && filterCircuito && d) {
      buffers += `<path d="${d}" fill="none" stroke="#ea580c" stroke-width="25" stroke-linecap="round" stroke-linejoin="round" opacity="0.45" class="circuit-buffer"/>`
    }
    
    return d ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}" data-sub="${subnorm}"/>` : ''
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">${mpioPaths}${mpioLabels}${buffers}${paths}</svg>`
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
    const avgAvF = vias.length ? Math.round(vias.reduce((s, v) => s + (v.avance ?? 0), 0) / vias.length) : 0
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
      <td><div class="bar-wrap"><div class="bar-pct">${avgAvF}%</div><div class="bar-bg"><div class="bar-fill" style="width:${Math.min(100, avgAvF)}%"></div></div></div></td>
      <td><div class="bar-wrap"><div class="bar-pct bar-pct--fin">${avgAfin}%</div><div class="bar-bg"><div class="bar-fill bar-fill--fin" style="width:${Math.min(100, avgAfin)}%"></div></div></div></td>
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
  const circuitos = new Set(vias.map(v => v.circuito || v.nombre)).size
  const km = vias.reduce((s, v) => s + (v.km ?? 0), 0)
  const municipios = new Set(vias.map(v => v.municipio)).size
  const avgAvF = vias.length ? Math.round(vias.reduce((s, v) => s + (v.avance ?? 0), 0) / vias.length) : 0

  const svgMap = buildSVGMap(geoFeatures, subregion, palette, 280, 320)
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
    map[key].km += (v.km ?? 0)
    map[key].avSum += (v.avance ?? 0)
    map[key].afSum += (v.avanceFin ?? 0)
    map[key].mpios.add(v.municipio)
  }
  const circuitos = Object.values(map).sort((a, b) => a.circuito.localeCompare(b.circuito, 'es'))

  const rows = circuitos.map((c, i) => {
    const avF = c.tramos ? Math.round(c.avSum / c.tramos) : 0
    const avFin = c.tramos ? Math.round(c.afSum / c.tramos) : 0
    const mpStr = [...c.mpios].join(', ')
    const mpDisp = mpStr.length > 30 ? mpStr.slice(0, 28) + '…' : mpStr
    return `<tr>
      <td class="td-gray">${i + 1}</td>
      <td class="td-left td-bold" style="font-size:7.5pt">${esc(c.circuito)}</td>
      <td class="td-left" style="font-size:6.5pt;color:#6b7280">${esc(mpDisp)}</td>
      <td style="font-size:7.5pt">${c.tramos}</td>
      <td class="td-bold" style="font-size:7.5pt">${c.km.toFixed(1)}</td>
      <td><div class="bar-wrap"><div class="bar-pct">${avF}%</div><div class="bar-bg"><div class="bar-fill" style="width:${Math.min(100, avF)}%"></div></div></div></td>
      <td><div class="bar-wrap"><div class="bar-pct bar-pct--fin">${avFin}%</div><div class="bar-bg"><div class="bar-fill bar-fill--fin" style="width:${Math.min(100, avFin)}%"></div></div></div></td>
      <td class="td-left" style="font-size:6.5pt">${esc(c.contratista ?? '')}</td>
    </tr>`
  }).join('')

  const totalKm = circuitos.reduce((s, c) => s + c.km, 0)
  const totalTrms = circuitos.reduce((s, c) => s + c.tramos, 0)
  const avgAvF = circuitos.length ? Math.round(circuitos.reduce((s, c) => s + (c.tramos ? c.avSum / c.tramos : 0), 0) / circuitos.length) : 0

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
  const palette = getSubregionPalette(subregion)

  // Group by circuit
  const map = {}
  for (const v of vias) {
    const key = v.circuito || v.nombre
    if (!map[key]) map[key] = { circuito: key, tramos: 0, km: 0, avSum: 0, afSum: 0, contratista: v.contratista }
    map[key].tramos++
    map[key].km += (v.km ?? 0)
    map[key].avSum += (v.avance ?? 0)
    map[key].afSum += (v.avanceFin ?? 0)
  }
  const circuitos = Object.values(map).sort((a, b) => a.circuito.localeCompare(b.circuito, 'es'))

  // Flat via rows
  const rows = vias.map((v, i) => {
    const avF = v.avance ?? 0
    const avFin = v.avanceFin ?? 0
    return `<tr>
      <td class="td-gray">${i + 1}</td>
      <td class="td-left td-bold" style="font-size:7.5pt">${esc(v.nombre)}</td>
      <td class="td-left" style="font-size:7pt">${esc(v.circuito ?? '')}</td>
      <td class="td-bold" style="font-size:7pt">${v.km ?? '—'}</td>
      <td><div class="bar-wrap"><div class="bar-pct">${avF}%</div><div class="bar-bg"><div class="bar-fill" style="width:${Math.min(100, avF)}%"></div></div></div></td>
      <td><div class="bar-wrap"><div class="bar-pct bar-pct--fin">${avFin}%</div><div class="bar-bg"><div class="bar-fill bar-fill--fin" style="width:${Math.min(100, avFin)}%"></div></div></div></td>
      <td class="td-left" style="font-size:6.5pt">${esc(v.contratista ?? '')}</td>
    </tr>`
  }).join('')

  const totalKm = vias.reduce((s, v) => s + (v.km ?? 0), 0)
  const avgAvF = vias.length ? Math.round(vias.reduce((s, v) => s + (v.avance ?? 0), 0) / vias.length) : 0
  const svgMap = buildSVGMap(geoFeatures, subregion, palette, 200, 240)

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
  const hasSub = filters.subregion && filters.subregion !== 'Todas las subregiones'
  const hasMpio = filters.municipio && filters.municipio !== 'Todos los municipios'
  const hasCir = filters.circuito && filters.circuito !== 'Todos los circuitos'

  // Adapt title & label to active filter
  let coverLabel = 'Documento de gestión pública'
  let titleLine1 = 'Reporte'
  let titleLine2 = 'Gerencial'
  let coverSubtitle = 'Red Vial Departamental de Antioquia — Sistema SIMEVA'
  let accentColor = '#3fad72'

  if (hasCir) {
    coverLabel = 'Análisis detallado de circuito'
    const parts = filters.circuito.split(' - ')
    titleLine1 = parts[0] ?? filters.circuito
    titleLine2 = parts.slice(1).join(' - ')
    coverSubtitle = 'Reporte Gerencial · Sistema SIMEVA'
  } else if (hasMpio) {
    const pal = getSubregionPalette(filters.subregion)
    accentColor = pal.accent
    coverLabel = `Subregión ${filters.subregion}`
    titleLine1 = 'Municipio'
    titleLine2 = filters.municipio
    coverSubtitle = 'Reporte de Municipio · Sistema SIMEVA'
  } else if (hasSub) {
    const pal = getSubregionPalette(filters.subregion)
    accentColor = pal.accent
    coverLabel = 'Reporte por subregión'
    titleLine1 = filters.subregion
    titleLine2 = ''
    coverSubtitle = 'Red Vial Departamental de Antioquia · Sistema SIMEVA'
  }

  const tags = []
  if (hasSub) tags.push(filters.subregion)
  if (hasMpio) tags.push(filters.municipio)
  if (hasCir) tags.push(filters.circuito)
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

  const MESES = { Ene: 0, Feb: 1, Mar: 2, Abr: 3, May: 4, Jun: 5, Jul: 6, Ago: 7, Sep: 8, Oct: 9, Nov: 10, Dic: 11 }
  const hoy = new Date()
  let todayIdx = rows.length - 1
  for (let i = 0; i < rows.length; i++) {
    const [mon, yr] = (rows[i].periodo ?? '').split('-')
    if (new Date(+yr, MESES[mon] ?? 0, 15) >= hoy) { todayIdx = i; break }
  }

  const chart = svgLineChart({
    labels: rows.map(r => r.periodo), yMax: 100, yTicks: 4, yFmt: v => v + '%', todayIdx,
    datasets: [
      { label: '% Inv. Acum. Programado', data: rows.map(r => r.inv_acum_prog), color: '#0b5640', width: 2.5, dotR: 3 },
      { label: '% Fís. Acum. Programado', data: rows.map(r => r.fis_acum_prog), color: '#3fad72', width: 2, dash: '6,3' },
      { label: '% Inv. Acum. Real', data: rows.map(r => r.inv_acum_real), color: '#b91c1c', width: 2.5, dash: '5,3', dotR: 4 },
      { label: '% Fís. Acum. Real', data: rows.map(r => r.fis_acum_real), color: '#d97706', width: 2.5, dash: '5,3', dotR: 4 },
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
  const vg = cd.valor_ganado ?? []
  const BAC = cd.bac_evm ?? cd.valor_contrato ?? 0
  if (!vg.length) return ''

  const pvV = vg.map(r => r.pv_acum), evV = vg.map(r => r.ev_acum), acV = vg.map(r => r.ac_acum)
  const allV = [...pvV, ...evV, ...acV].filter(v => v != null)
  const yMaxVG = Math.ceil(Math.max(BAC, allV.length ? Math.max(...allV) : BAC) / 1e9) * 1e9 || 1e9
  const yFmtVG = v => v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`

  const chart = svgLineChart({
    labels: vg.map(r => r.periodo), yMax: yMaxVG, yTicks: 4, yFmt: yFmtVG,
    datasets: [
      { label: 'PV — Valor Planificado', data: pvV, color: '#0b5640', width: 2.5, dotR: 3 },
      { label: 'EV — Valor Ganado', data: evV, color: '#3fad72', width: 2.5, dash: '6,3', dotR: 4 },
      { label: 'AC — Costo Real', data: acV, color: '#b91c1c', width: 2.5, dash: '4,4', dotR: 4 },
    ],
  })

  const rows = vg.map((r, i) => {
    const pv = r.pv_acum, ev = r.ev_acum, ac = r.ac_acum
    const sv = ev != null && pv != null ? ev - pv : null
    const cv = ev != null && ac != null ? ev - ac : null
    const spi = ev != null && pv > 0 ? ev / pv : null
    const cpi = ev != null && ac > 0 ? ev / ac : null
    const eac = cpi > 0 ? BAC / cpi : null
    const etc = eac != null && ac != null ? eac - ac : null
    const vac = eac != null ? BAC - eac : null
    const clsSpi = spi == null ? '' : spi >= 1 ? 'td-ok' : spi >= 0.85 ? 'td-warn' : 'td-bad'
    const clsCpi = cpi == null ? '' : cpi >= 1 ? 'td-ok' : cpi >= 0.85 ? 'td-warn' : 'td-bad'
    const clsSv = sv == null ? '' : sv >= 0 ? 'td-ok' : 'td-bad'
    const clsCv = cv == null ? '' : cv >= 0 ? 'td-ok' : 'td-bad'
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
  const lSpi = lEv && lPv > 0 ? lEv / lPv : null
  const lCpi = lEv && lAc > 0 ? lEv / lAc : null
  const lEac = lCpi > 0 ? BAC / lCpi : null
  const lEtc = lEac != null && lAc != null ? lEac - lAc : null
  const lVac = lEac != null ? BAC - lEac : null
  const lSv = lEv != null && lPv != null ? lEv - lPv : null
  const lCv = lEv != null && lAc != null ? lEv - lAc : null

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
        <div class="kpi-card-val" style="font-size:14pt;color:${lSpi != null ? (lSpi >= 1 ? '#0b5640' : lSpi >= 0.85 ? '#d97706' : '#b91c1c') : '#0b5640'}">${fmtI(lSpi)}</div>
        <div class="kpi-card-lbl">SPI (EV/PV)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-card-val" style="font-size:14pt;color:${lCpi != null ? (lCpi >= 1 ? '#0b5640' : lCpi >= 0.85 ? '#d97706' : '#b91c1c') : '#0b5640'}">${fmtI(lCpi)}</div>
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
          <td class="${lSv != null ? (lSv >= 0 ? 'td-ok' : 'td-bad') : ''}">${lSv != null ? fmtC(lSv) : '—'}</td>
          <td class="${lCv != null ? (lCv >= 0 ? 'td-ok' : 'td-bad') : ''}">${lCv != null ? fmtC(lCv) : '—'}</td>
          <td class="${lSpi != null ? (lSpi >= 1 ? 'td-ok' : lSpi >= .85 ? 'td-warn' : 'td-bad') : ''}">${fmtI(lSpi)}</td>
          <td class="${lCpi != null ? (lCpi >= 1 ? 'td-ok' : lCpi >= .85 ? 'td-warn' : 'td-bad') : ''}">${fmtI(lCpi)}</td>
          <td class="td-proy">${fmtC(lEac)}</td><td class="td-proy">${fmtC(lEtc)}</td><td class="td-proy">${fmtC(lVac)}</td>
          <td></td>
        </tr></tfoot>
      </table>
    </div>
    ${pgFooter(fecha)}
  </div>`
}

function buildMRPage(logoUrl, fecha, cd, pageNum) {
  const mr = cd.modulo_resiliente
  const est = mr?.estaciones ?? []
  if (!est.length) return ''

  const cond = v => {
    if (v == null) return { label: '—', cls: '' }
    if (v >= 200) return { label: '✓ BUENA', cls: 'badge badge-ok' }
    if (v >= 100) return { label: '⚠ REGULAR', cls: 'badge badge-warn' }
    return { label: '✗ DEFICIENTE', cls: 'badge badge-bad' }
  }

  const trs = est.map(e => {
    const proy = e.mr_proyectado ?? e.mr_disenho
    const delta = e.mr_medido != null && proy != null ? e.mr_medido - proy : null
    const ratio = e.mr_medido != null && proy > 0 ? (e.mr_medido / proy * 100) : null
    const c = cond(e.mr_medido)
    return `<tr>
      <td class="td-mono">${esc(e.abscisa)}</td>
      <td class="td-bold" style="font-size:11pt;color:#6d28d9">${fmtN(e.mr_medido)}</td>
      <td style="color:#b91c1c;font-weight:700">${fmtN(proy)}</td>
      <td class="${delta != null ? (delta >= 0 ? 'td-ok' : 'td-bad') : ''}">${delta != null ? (delta >= 0 ? '+' : '') + fmtN(delta) : '—'}</td>
      <td>${ratio != null ? ratio.toFixed(1) + '%' : '—'}</td>
      <td><span class="${c.cls}">${c.label}</span></td>
      <td class="td-left" style="font-size:7pt;white-space:normal;max-width:140px">${esc(e.observacion ?? '')}</td>
    </tr>`
  }).join('')

  const okN = est.filter(e => e.mr_medido >= 200).length
  const warnN = est.filter(e => e.mr_medido >= 100 && e.mr_medido < 200).length
  const badN = est.filter(e => e.mr_medido < 100).length

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
    { key: 'e1_e142', label: 'PROC', norma: 'E-142' }, { key: 'e1_e148i', label: 'CBR-I', norma: 'E-148' },
    { key: 'e1_e148c', label: 'CBR-C', norma: 'E-148' }, { key: 'e1_e172', label: 'DCP', norma: 'E-172' },
  ]
  const ETAPA2 = [
    { key: 'e2_e213', label: 'GRAN', norma: 'E-213' }, { key: 'e2_e125126', label: 'LL-LP', norma: 'E-125/126' },
    { key: 'e2_e122', label: 'HUM', norma: 'E-122' }, { key: 'e2_une103204', label: 'ORG', norma: 'UNE103204' },
    { key: 'e2_e133', label: 'EA', norma: 'E-133' }, { key: 'e2_e235', label: 'AZM', norma: 'E-235' },
    { key: 'e2_une103201', label: 'SAL', norma: 'UNE103201' }, { key: 'e2_e132', label: 'EXP', norma: 'E-132' },
  ]
  const ETAPA3 = [
    { key: 'e3_e142', label: 'PROC', norma: 'E-142' }, { key: 'e3_e148', label: 'CBR', norma: 'E-148' },
    { key: 'e3_e601', label: 'PH', norma: 'E-601' }, { key: 'e3_e414613', label: 'FLEX', norma: 'E-414/613' },
    { key: 'e3_e613614', label: 'DSC', norma: 'E-613/614' },
  ]
  const ALL = [...ETAPA1, ...ETAPA2, ...ETAPA3]

  const hE1 = ETAPA1.map(c => `<th class="th-e1" style="font-size:5.5pt;padding:3px 4px">${c.label}<br><span style="opacity:.7">${c.norma}</span></th>`).join('')
  const hE2 = ETAPA2.map(c => `<th class="th-e2" style="font-size:5.5pt;padding:3px 4px">${c.label}<br><span style="opacity:.7">${c.norma}</span></th>`).join('')
  const hE3 = ETAPA3.map(c => `<th class="th-e3" style="font-size:5.5pt;padding:3px 4px">${c.label}<br><span style="opacity:.7">${c.norma}</span></th>`).join('')

  const trs = puntos.map(p => {
    const done = ALL.filter(c => p[c.key]?.fecha).length
    const pct = Math.round(done / ALL.length * 100)
    const pctCls = pct === 100 ? 'badge badge-ok' : pct > 0 ? 'badge badge-warn' : 'badge'
    const cells = ALL.map(c => {
      const v = p[c.key]
      return v?.fecha
        ? `<td class="cell-done"><span class="cell-fecha">${esc(v.fecha)}</span>${v.valor != null ? `<span class="cell-val">${esc(v.valor)}</span>` : ''}</td>`
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
    const hasCurvaS = !!(cd?.curva_s?.length)
    const hasEVM = !!(cd?.valor_ganado?.length)
    const hasMR = !!(cd?.modulo_resiliente?.estaciones?.length)
    const hasEnsayos = !!(cd?.ensayos_matricial?.length)

    let p = 3
    const tocEntries = [
      { name: 'Resumen Ejecutivo', sub: 'Tramos intervenidos, avance físico y financiero', pg: p, color: '#0b5640' },
    ]
    if (hasCurvaS) { p += 2; tocEntries.push({ name: 'Curva S', sub: 'Inversión y ejecución física programada vs. real', pg: p, color: '#1a7a56' }) }
    if (hasEVM) { p += 2; tocEntries.push({ name: 'Valor Ganado (EVM)', sub: 'SPI, CPI, EAC y proyecciones de costo', pg: p, color: '#1d4ed8' }) }
    if (hasMR) { p += 2; tocEntries.push({ name: 'Módulo Resiliente', sub: 'Capacidad estructural medida vs. proyectada', pg: p, color: '#6d28d9' }) }
    if (hasEnsayos) { p += 2; tocEntries.push({ name: 'Ensayos de Laboratorio', sub: 'Check list matricial CCE-EICP-IDI-01 v4', pg: p, color: '#b45309' }) }

    const pages = [
      { html: buildCover(logoUrl, fecha, filters, stats), section: 'Portada' },
      { html: buildTOCPage(logoUrl, fecha, tocEntries), section: 'Contenido' },
      { html: buildResumenPage(logoUrl, fecha, stats), section: 'Resumen Ejecutivo' },
    ]

    if (cd) {
      const pgCurva = tocEntries.find(e => e.name === 'Curva S')?.pg
      const pgEVM = tocEntries.find(e => e.name === 'Valor Ganado (EVM)')?.pg
      const pgMR = tocEntries.find(e => e.name === 'Módulo Resiliente')?.pg
      const pgEns = tocEntries.find(e => e.name === 'Ensayos de Laboratorio')?.pg

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
      { html: buildCover(logoUrl, fecha, filters, stats), section: 'Portada' },
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
      name: sub,
      sub: `${new Set(subregionMap[sub].map(v => v.circuito || v.nombre)).size} circuitos · ${subregionMap[sub].reduce((s, v) => s + (v.km ?? 0), 0).toFixed(0)} km`,
      pg: p,
      color: getSubregionPalette(sub).accent,
    })
    p++
  })

  const pages = [
    { html: buildCover(logoUrl, fecha, filters, stats), section: 'Portada' },
    { html: buildTOCPage(logoUrl, fecha, tocEntries), section: 'Contenido' },
    { html: buildGlobalResumenPage(logoUrl, fecha, stats, subregionMap, subregiones), section: 'Resumen General' },
  ]

  subregiones.forEach((sub, i) => {
    const palette = getSubregionPalette(sub)
    const secNum = String(i + 1).padStart(2, '0')
    const splashPg = tocEntries.find(e => e.name === sub)?.pg ?? (4 + i * 2)
    pages.push({ html: buildSubregionSplash(sub, subregionMap[sub], logoUrl, splashPg, secNum, palette, geoFeatures), section: '' })
    pages.push({ html: buildSubregionDetailPage(sub, subregionMap[sub], logoUrl, fecha, splashPg + 1, secNum, palette), section: sub })
  })

  return pages
}

export { CSS }

// ── PPT helpers ──────────────────────────────────────────────────────────────
function buildPptCoverSlide(logoUrl, fecha, filters, stats) {
  const hasCir  = filters?.circuito  && filters.circuito  !== 'Todos los circuitos'
  const hasSub  = filters?.subregion && filters.subregion !== 'Todas las subregiones'
  const hasMpio = filters?.municipio && filters.municipio !== 'Todos los municipios'

  let titleLines = ['PROGRAMA DE', 'ESTABILIZACIÓN', 'DE VÍAS']
  if (hasCir) {
    const parts = filters.circuito.split(' - ')
    titleLines = parts.length > 1
      ? [parts[0].toUpperCase(), parts.slice(1).join(' - ').toUpperCase()]
      : [filters.circuito.toUpperCase()]
  } else if (hasSub) {
    titleLines = [filters.subregion.toUpperCase()]
  } else if (hasMpio) {
    titleLines = [filters.municipio.toUpperCase()]
  }

  const maxLen   = Math.max(...titleLines.map(l => l.length))
  const fontSize = maxLen > 32 ? 42 : maxLen > 22 ? 54 : maxLen > 14 ? 64 : 76

  return `
  <div class="ppt-slide" style="position:relative;overflow:hidden;font-family:'Prompt',sans-serif">
    <img src="/images/presentacion/portada.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block" alt=""/>
    <div style="position:absolute;inset:0;display:flex;align-items:flex-start;justify-content:center;padding-top:60px">
      <div style="text-align:center;line-height:1.0;letter-spacing:-.025em">
        ${titleLines.map(l =>
          `<div style="font-size:${fontSize}px;font-weight:900;color:#0b5640;text-shadow:0 2px 24px rgba(255,255,255,.9),0 0 48px rgba(255,255,255,.7)">${esc(l)}</div>`
        ).join('')}
      </div>
    </div>
  </div>`
}

function buildPptResumenSlide(logoUrl, stats, geoFeatures = [], mpioFeatures = []) {
  const normStr = s => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

  const knownSubs = ['Bajo Cauca', 'Magdalena Medio', 'Nordeste', 'Norte', 'Occidente', 'Oriente', 'Suroeste', 'Urabá', 'Valle de Aburrá']
  const subMap = {}
  for (const f of geoFeatures) {
    const sub = f.properties?.SUBREGION
    if (!sub) continue
    const nSub = normStr(sub)
    let finalSub = knownSubs.find(k => normStr(k) === nSub)
    if (!finalSub) finalSub = sub.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    if (!subMap[finalSub]) subMap[finalSub] = 0
    subMap[finalSub] += parseFloat(f.properties?.Long_km) || 0
  }

  const subs  = Object.entries(subMap).map(([name, km]) => ({ name, km }))
  const total = subs.reduce((s, x) => s + x.km, 0)

  const uid  = 'dn' + Math.random().toString(36).slice(2, 7)
  const over = `(function(el){var u='${uid}';var mn=u+'map';var subn=el.dataset.subnorm;document.querySelectorAll('[data-dn]').forEach(function(e){if(e.getAttribute('data-dn')===u)e.style.opacity=e.dataset.subnorm===subn?'1':'0.18'});var map=document.getElementById(mn);if(map){map.querySelectorAll('[data-sub]').forEach(function(p){p.style.opacity=p.dataset.sub===subn?'1':'0.25';p.setAttribute('stroke-width',p.dataset.sub===subn?'3.5':'2.4')});map.querySelectorAll('[data-msub]').forEach(function(p){if(p.dataset.msub===subn){p.style.fill='rgba(11,86,64,0.25)';p.style.stroke='rgba(11,86,64,0.5)';p.setAttribute('stroke-width','1.2');p.style.opacity='1'}else{p.style.fill='';p.style.stroke='';p.setAttribute('stroke-width','0.7');p.style.opacity='0.65'}});}var l=document.getElementById(u+'cl');var v=document.getElementById(u+'vl');if(l)l.textContent=el.dataset.name;if(v)v.textContent=el.dataset.km+' km';document.querySelectorAll('[data-trow]').forEach(function(r){if(r.getAttribute('data-trow')===u)r.style.background=r.dataset.subnorm===subn?'rgba(11,86,64,0.12)':''});var slide=el.closest('.ppt-slide');if(slide){slide.querySelectorAll('[data-bgsub]').forEach(function(img){img.style.opacity=img.dataset.bgsub===subn?'0.75':'0'});var def=slide.querySelector('.bg-default');if(def)def.style.opacity='0';}})(this)`
  const out  = `(function(el){var u='${uid}';var mn=u+'map';document.querySelectorAll('[data-dn]').forEach(function(e){if(e.getAttribute('data-dn')===u)e.style.opacity='1'});var map=document.getElementById(mn);if(map){map.querySelectorAll('[data-sub]').forEach(function(p){p.style.opacity='';p.setAttribute('stroke-width','2.4')});map.querySelectorAll('[data-msub]').forEach(function(p){p.style.fill='';p.style.stroke='';p.style.opacity='';p.setAttribute('stroke-width','0.7')});}var l=document.getElementById(u+'cl');var v=document.getElementById(u+'vl');if(l)l.textContent='';if(v)v.textContent='';document.querySelectorAll('[data-trow]').forEach(function(r){if(r.getAttribute('data-trow')===u)r.style.background=''});var slide=el.closest('.ppt-slide');if(slide){slide.querySelectorAll('[data-bgsub]').forEach(function(img){img.style.opacity='0'});var def=slide.querySelector('.bg-default');if(def)def.style.opacity='1';}})(this)`

  const pieW = 280, cx = 140, cy = 128, R = 112
  let ang = -Math.PI / 2
  const slicePaths = subs.map(s => {
    const sweep = total > 0 ? (s.km / total) * 2 * Math.PI : 0
    if (sweep < 0.005) return ''
    const a1 = ang, a2 = ang + sweep
    ang += sweep
    const color = getSubregionPalette(s.name).accent
    const km = s.km.toFixed(2)
    const subnorm = normStr(s.name)
    const large = sweep > Math.PI ? 1 : 0
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1)
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2)
    const d = `M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`
    return `<path d="${d}" fill="${color}" stroke="#fff" stroke-width="1.5" data-dn="${uid}" data-subnorm="${subnorm}" data-name="${esc(s.name)}" data-km="${km}" style="cursor:pointer;transition:opacity .18s" onmouseover="${over}" onmouseout="${out}"/>`
  }).join('')

  const labelDiv = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;font-family:'Poppins',sans-serif;margin-top:10px">
    <span id="${uid}cl" style="font-size:39px;font-weight:600;color:#4b5563;line-height:1"></span>
    <span id="${uid}vl" style="font-size:48px;font-weight:900;color:#0b5640;line-height:1"></span>
  </div>`

  const donutSvg = total > 0
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${pieW}" height="${cy + R + 10}" viewBox="0 0 ${pieW} ${cy + R + 10}">${slicePaths}</svg>`
    : `<div style="color:#9ca3af;font-size:12px;padding:20px;text-align:center">Sin datos</div>`

  const rows = subs.map((s, i) => {
    const color = getSubregionPalette(s.name).accent
    const km = s.km.toFixed(2)
    const pct = total > 0 ? Math.round((s.km / total) * 100) : 0
    const subnorm = normStr(s.name)
    const bg = i % 2 === 0 ? '#f6fdf9' : '#fff'
    return `<tr style="background:${bg};cursor:pointer;transition:background .15s" data-trow="${uid}" data-subnorm="${subnorm}" data-name="${esc(s.name)}" data-km="${km}" onmouseover="${over}" onmouseout="${out}">
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:12px"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${color};margin-right:5px;vertical-align:middle"></span>${esc(s.name)}</td>
      <td style="padding:5px 8px;text-align:right;border-bottom:1px solid #e5e7eb;font-size:12px;font-weight:700;color:#0b5640">${km}</td>
      <td style="padding:5px 8px;text-align:right;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280">${pct}%</td>
    </tr>`
  }).join('')

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;font-family:'Poppins',sans-serif">
      <thead><tr style="background:#0b5640;color:#fff">
        <th style="padding:7px 8px;text-align:left;font-size:12px;font-weight:700;border-radius:6px 0 0 0">Subregión</th>
        <th style="padding:7px 8px;text-align:right;font-size:12px;font-weight:700">Km</th>
        <th style="padding:7px 8px;text-align:right;font-size:12px;font-weight:700;border-radius:0 6px 0 0">%</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="background:#0b5640;color:#fff">
        <td style="padding:7px 8px;font-size:12px;font-weight:900">TOTAL</td>
        <td style="padding:7px 8px;text-align:right;font-size:12px;font-weight:900">${total.toFixed(2)}</td>
        <td style="padding:7px 8px;text-align:right;font-size:12px;font-weight:900">100%</td>
      </tfoot>
    </table>`

  const rawMap = buildSVGMap(geoFeatures, null, { accent: '#3fad72' }, 460, 540, mpioFeatures, true)
  const svgMap = rawMap ? rawMap.replace('<svg ', `<svg id="${uid}map" `) : ''

  const bgImages = subs.map(s => {
    const subnorm = normStr(s.name)
    const src = `/images/presentacion/${s.name.toLowerCase()}.jpg`
    return `<img src="${src}" data-bgsub="${subnorm}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.4s ease" onerror="this.style.display='none'" alt=""/>`
  }).join('')

  const sideImagesPanel = `
    <div style="position:absolute;top:20%;right:26px;width:225px;bottom:70px;background:#f3f4f6;border-radius:12px;overflow:hidden;box-shadow:inset 0 2px 10px rgba(0,0,0,0.05)">
      ${bgImages}
      <div class="bg-default" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;text-align:center;color:#9ca3af;font-size:11px;font-weight:600;transition:opacity 0.4s ease;flex-direction:column;gap:8px">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        Pasa el cursor sobre una subregión para ver su fotografía
      </div>
    </div>`

  return `
  <div class="ppt-slide" style="position:relative;overflow:hidden;font-family:'Poppins',sans-serif">
    <img src="/images/presentacion/paginas.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block" alt=""/>
    ${sideImagesPanel}
    <div style="position:absolute;inset:0;padding:16px 280px 70px 36px;display:flex;flex-direction:column">
      <div style="font-size:23px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#0b5640;margin-bottom:12px;font-family:'Poppins',sans-serif">RESUMEN EJECUTIVO — PROGRAMA DE ESTABILIZACIÓN DE VÍAS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;flex:1;min-height:0">
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden">
          ${svgMap || '<span style="color:#9ca3af;font-size:12px">Sin datos geográficos</span>'}
          ${labelDiv}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;min-height:0;overflow:hidden">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0">
            <div style="font-size:14px;font-weight:800;color:#0b5640;margin-bottom:2px;letter-spacing:0.02em">Longitud por Subregión</div>
            ${donutSvg}
          </div>
          <div style="flex:1;min-height:0;overflow:auto">${tableHtml}</div>
        </div>
      </div>
    </div>
  </div>`
}



function buildPptCircuitoSlide(logoUrl, subregion, circuito, vias) {
  const p        = getSubregionPalette(subregion)
  const km       = vias.reduce((s, v) => s + (v.km ?? 0), 0)
  const avgAvF   = vias.length ? Math.round(vias.reduce((s, v) => s + (v.avance    ?? 0), 0) / vias.length) : 0
  const avgAvFin = vias.length ? Math.round(vias.reduce((s, v) => s + (v.avanceFin ?? 0), 0) / vias.length) : 0
  const contratistas = [...new Set(vias.map(v => v.contratista).filter(Boolean))]
  const municipios   = [...new Set(vias.map(v => v.municipio).filter(Boolean))]
  const plazo        = vias.find(v => v.plazo)?.plazo ?? '—'

  const photoStrip = ['antes', 'durante', 'despues'].map(t => `
    <div class="ppt-photo-item">
      <img src="${circuitPhotoUrl(circuito, t)}" alt="${t}"
           onerror="this.closest('.ppt-photo-item').style.display='none'" />
      <span class="ppt-photo-lbl">${t}</span>
    </div>`).join('')

  const viaRows = vias.slice(0, 10).map(v => {
    const fill = (v.avance ?? 0) >= 80 ? '#34d399' : (v.avance ?? 0) >= 40 ? p.accent : '#f87171'
    return `
    <div class="ppt-via-row">
      <div class="ppt-via-name">${esc(v.nombre)}</div>
      <div class="ppt-via-km">${v.km ?? '—'} km</div>
      <div class="ppt-via-bar-wrap"><div class="ppt-via-bar-fill" style="width:${Math.min(100, v.avance ?? 0)}%;background:${fill}"></div></div>
      <div class="ppt-via-pct">${v.avance ?? 0}%</div>
    </div>`
  }).join('')

  const loteMap = {
    'oriente': 'LOTE 1', 'occidente': 'LOTE 2', 'uraba': 'LOTE 3', 'magdalena medio': 'LOTE 4',
    'suroeste': 'LOTE 5', 'nordeste': 'LOTE 6', 'bajo cauca': 'LOTE 7', 'norte': 'LOTE 8'
  }
  const lotePref = loteMap[norm(subregion)] ? `${loteMap[norm(subregion)]}: ` : ''

  return `
  <div class="ppt-slide" style="position:relative;overflow:hidden;font-family:'Prompt',sans-serif">
    <img src="/images/presentacion/paginas.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block" alt=""/>
    <div style="position:absolute;inset:0;padding:14px 275px 70px 36px">
      <div style="font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#0b5640;margin-bottom:2px">INTERVENCIÓN VIAL — ${esc(circuito)}</div>
      <div style="font-family:'Poppins',sans-serif;text-transform:uppercase;color:#ff751f;font-size:16px;font-weight:700;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #e5e7eb">${lotePref}${esc(subregion)}</div>
      <div class="ppt-circuit-kpis">
        <div class="ppt-big-kpi" style="border-top:4px solid #0b5640">
          <div class="ppt-big-kpi-val" style="color:#0b5640">${avgAvF}%</div>
          <div class="ppt-big-kpi-lbl">Avance Físico</div>
          <div class="ppt-big-progress"><div style="width:${avgAvF}%;background:#0b5640"></div></div>
        </div>
        <div class="ppt-big-kpi" style="border-top:4px solid #d97706">
          <div class="ppt-big-kpi-val" style="color:#d97706">${avgAvFin}%</div>
          <div class="ppt-big-kpi-lbl">Avance Financiero</div>
          <div class="ppt-big-progress"><div style="width:${avgAvFin}%;background:#d97706"></div></div>
        </div>
        <div class="ppt-big-kpi" style="border-top:4px solid ${p.accent}">
          <div class="ppt-big-kpi-val">${km.toFixed(1)}</div>
          <div class="ppt-big-kpi-lbl">Kilómetros</div>
        </div>
        <div class="ppt-big-kpi" style="border-top:4px solid #6b7280">
          <div class="ppt-big-kpi-val">${vias.length}</div>
          <div class="ppt-big-kpi-lbl">Tramos</div>
        </div>
      </div>
      <div class="ppt-two-col" style="margin-top:14px">
        <div>
          <div class="ppt-section-title">Tramos del circuito</div>
          <div class="ppt-via-list">${viaRows}</div>
        </div>
        <div>
          <div class="ppt-section-title">Información general</div>
          <div class="ppt-info-grid">
            <div class="ppt-info-item"><div class="ppt-info-lbl">Subregión</div><div class="ppt-info-val">${esc(subregion)}</div></div>
            <div class="ppt-info-item"><div class="ppt-info-lbl">Municipio(s)</div><div class="ppt-info-val">${esc(municipios.slice(0, 3).join(', ') || '—')}</div></div>
            <div class="ppt-info-item"><div class="ppt-info-lbl">Contratista</div><div class="ppt-info-val">${esc(contratistas.slice(0, 2).join(', ') || '—')}</div></div>
            <div class="ppt-info-item"><div class="ppt-info-lbl">Plazo</div><div class="ppt-info-val">${esc(plazo)}</div></div>
          </div>
          <div class="ppt-photo-strip">${photoStrip}</div>
        </div>
      </div>
    </div>
  </div>`
}

function buildPptSeguimientoSlide(logoUrl, circuito, registros, cronData, avF, avFin, geoFeatures = [], mpioFeatures = []) {
  const subregion = cronData?.subregion ?? ''
  const loteMap = {
    'oriente': 'LOTE 1', 'occidente': 'LOTE 2', 'uraba': 'LOTE 3', 'magdalena medio': 'LOTE 4',
    'suroeste': 'LOTE 5', 'nordeste': 'LOTE 6', 'bajo cauca': 'LOTE 7', 'norte': 'LOTE 8'
  }
  const lotePref = loteMap[norm(subregion)] ? `${loteMap[norm(subregion)]}: ` : ''

  const feats   = geoFeatures.filter(f => norm(f.properties?.CIRCUITO) === norm(circuito))
  const mpios   = [...new Set(feats.map(f => f.properties?.MPIO_NOMBR).filter(Boolean))].join(', ') || '—'
  const totalKm = feats.reduce((sum, f) => sum + (parseFloat(f.properties?.Long_km) || 0), 0)
  const fFirst  = feats[0]?.properties || {}

  const tabId = 'seg_' + norm(circuito).replace(/[\W_]+/g, '')

  // ── Pulse animation (injected once per slide) ──
  const pulseStyle = `<style>
    @keyframes vial-pulse{0%,100%{opacity:.55}50%{opacity:.05}}
    #${tabId}_p1 .circuit-buffer{animation:vial-pulse 1.4s ease-in-out infinite}
  </style>`

  // ── MAP (panel 1) ──
  // height=null → auto-calculated from geographic aspect ratio of the subregion
  const rawMap = buildSVGMap(geoFeatures, subregion, { accent: '#0b5640', showLabels: true, labelSize: 5 }, 400, null, mpioFeatures, true, circuito)
  // Replace fixed px dimensions with percentage so the SVG scales to fill its container
  // preserveAspectRatio="xMidYMid meet" keeps the full subregion visible with letterboxing
  const mapSvg = rawMap
    ? rawMap.replace(/(<svg[^>]*) width="\d+" height="\d+"/, '$1 width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block"')
    : null
  const kmLabel = totalKm > 0
    ? `<div style="position:absolute;bottom:0;left:0;right:0;text-align:center;line-height:1.1">
        <div style="font-size:13px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:.08em">Longitud</div>
        <div style="font-size:39px;font-weight:900;color:#0b5640;letter-spacing:-.01em">${totalKm.toFixed(2)} km</div>
      </div>`
    : ''
  const mapPanel = mapSvg ? `
    <div style="position:absolute;left:36px;top:103px;bottom:40px;width:400px;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;bottom:${totalKm > 0 ? '72px' : '0'}">${mapSvg}</div>
      ${kmLabel}
    </div>` : `
    <div style="position:absolute;left:36px;top:103px;bottom:40px;width:400px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:14px">Sin datos geográficos</div>`

  // ── RIGHT COLUMN TOP: INFO & EJECUCION TOGGLE ──
  const formatMoney = v => v ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v) : '—'
  
  const lastReg = registros?.length
    ? [...registros].sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? ''))[0]
    : null

  const carouselId = 'carrusel_' + norm(circuito).replace(/[\W_]+/g, '')
  const actModalId = 'act_modal_' + norm(circuito).replace(/[\W_]+/g, '')

  function actividadCard(act, color, bgColor) {
    const safeName = esc(act.nombre ?? '—').replace(/'/g, "\\'").replace(/"/g, '&quot;')
    const safeDesc = act.desc ? esc(act.desc).replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\\n/g, '<br>') : ''
    const fotosArray = (act.fotos || []).map(u => u.replace('/public/', '/'))
    
    const fotosStr = fotosArray.map(url => `<img src=\\'${url}\\' style=\\'width:100%;height:140px;object-fit:cover;border-radius:8px;cursor:zoom-in;border:1px solid rgba(0,0,0,0.05)\\' onclick=\\'const mx=document.getElementById("modal_${carouselId}");const ix=document.getElementById("img_modal_${carouselId}");if(mx&&ix){ix.src="${url}";mx.style.display="flex";}\\'/>`).join('')

    const onclickStr = `const m = document.getElementById('${actModalId}');if(m){document.getElementById('${actModalId}_title').innerHTML = '${safeName}';document.getElementById('${actModalId}_desc').innerHTML = '${safeDesc}';document.getElementById('${actModalId}_fotos').innerHTML = '${fotosStr}';m.style.display = 'flex';}`
    const safeOnclick = onclickStr.replace(/"/g, '&quot;')

    let miniFotos = ''
    if (fotosArray.length > 0) {
      miniFotos = `<div style="display:flex;gap:4px;margin-top:8px">` +
        fotosArray.slice(0, 5).map(url => `<div style="width:26px;height:26px;border-radius:4px;background-image:url('${url}');background-size:cover;background-position:center;border:1px solid rgba(0,0,0,0.1)"></div>`).join('') +
        (fotosArray.length > 5 ? `<div style="font-size:10px;font-weight:700;color:#6b7280;display:flex;align-items:center;margin-left:4px">+${fotosArray.length-5}</div>` : '') +
        `</div>`
    }

    return `<div onclick="${safeOnclick}" style="background:${bgColor};border:1px solid rgba(0,0,0,0.03);border-left:4px solid ${color};border-radius:8px;padding:12px 14px;margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,0.02);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 6px rgba(0,0,0,0.02)'">
      <div style="font-size:12px;font-weight:800;color:#1f2937;letter-spacing:0.02em;line-height:1.2;display:flex;justify-content:space-between;align-items:flex-start">
        <span style="flex:1">${esc(act.nombre ?? '—')}</span>
        <svg style="width:14px;height:14px;color:#9ca3af;flex-shrink:0;margin-left:8px" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
      </div>
      ${act.desc ? `<div style="font-size:10.5px;color:#6b7280;margin-top:4px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(act.desc)}</div>` : ''}
      ${miniFotos}
    </div>`
  }

  // Ejecutadas (Histórico completo)
  const ejecutadasMap = new Map()
  if (registros && registros.length) {
    const sortedReg = [...registros].sort((a, b) => (a.fecha ?? '').localeCompare(b.fecha ?? ''))
    sortedReg.forEach(r => {
      if (r.ejecutadas && r.ejecutadas.length) {
        r.ejecutadas.forEach(act => {
          if (!ejecutadasMap.has(act.nombre)) {
            ejecutadasMap.set(act.nombre, act)
          }
        })
      }
    })
  }
  const todasEjecutadas = Array.from(ejecutadasMap.values())
  const ejecutadasHtml = todasEjecutadas.length 
    ? todasEjecutadas.map(a => actividadCard(a, '#16a34a', '#f0fdf4')).join('')
    : ''

  // En ejecución (Último corte)
  const enEjecucionHtml = lastReg?.en_ejecucion?.length
    ? lastReg.en_ejecucion.map(a => actividadCard(a, '#d97706', '#fffbeb')).join('')
    : `<div style="color:#9ca3af;font-size:12px;padding:8px 0">No hay actividades en ejecución</div>`

  const gridStyle = ejecutadasHtml ? "display:grid;grid-template-columns:1fr 1fr;gap:24px" : "display:grid;grid-template-columns:1fr;gap:24px"

  let columnsHtml = ''
  if (ejecutadasHtml) {
    columnsHtml += `
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#16a34a;margin-bottom:12px;display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:#16a34a;display:inline-block"></span>Ejecutadas (Histórico)
          </div>
          ${ejecutadasHtml}
        </div>`
  }
  columnsHtml += `
        <div>
          <div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#d97706;margin-bottom:12px;display:flex;align-items:center;gap:6px">
            <span style="width:8px;height:8px;border-radius:50%;background:#d97706;display:inline-block"></span>En Ejecución (Último corte)
          </div>
          ${enEjecucionHtml}
        </div>`

  const btnActsId = 'btn-acts-' + norm(circuito).replace(/[\W_]+/g, '')
  const btnInfoId = 'btn-info-' + norm(circuito).replace(/[\W_]+/g, '')
  
  const infoPanel = `
    <div style="position:absolute;left:470px;top:178px;right:36px;height:220px;background:#f9fafb;border-radius:12px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,0.05)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:2px solid #e5e7eb;padding-bottom:6px">
        <div style="font-size:13px;font-weight:800;color:#0b5640;letter-spacing:.04em;text-transform:uppercase">Información del Circuito</div>
        <button id="${btnActsId}" onclick="document.getElementById('${tabId}_col1').style.display='none';document.getElementById('${tabId}_col2').style.display='block';this.classList.add('active');" style="background:#0b5640;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:10px;font-weight:700;cursor:pointer;letter-spacing:0.05em;text-transform:uppercase;transition:background 0.2s;font-family:'Prompt',sans-serif">Ver Ejecución ➔</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;color:#4b5563">
        <div><strong style="color:#111827;font-size:11px;display:block;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Municipio(s)</strong>${esc(mpios)}</div>
        <div><strong style="color:#111827;font-size:11px;display:block;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Longitud</strong>${totalKm ? totalKm.toFixed(2) + ' km' : '—'}</div>
        <div><strong style="color:#111827;font-size:11px;display:block;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Contratista</strong><span style="font-size:12px">${esc(fFirst.CONTRATIST ?? '—')}</span></div>
        <div><strong style="color:#111827;font-size:11px;display:block;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Interventoría</strong><span style="font-size:12px">${esc(fFirst.INTERV ?? '—')}</span></div>
        <div><strong style="color:#111827;font-size:11px;display:block;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Valor Contrato</strong><span style="font-size:11px">${formatMoney(fFirst.VALOR_CTO)}</span></div>
        <div><strong style="color:#111827;font-size:11px;display:block;text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">Plazo</strong>${fFirst.PLAZO_MESE ? fFirst.PLAZO_MESE + ' meses' : '—'}</div>
      </div>
    </div>`

  const execPanel = `
    <div id="${tabId}_col2" style="display:none;position:absolute;left:470px;top:178px;right:36px;bottom:46px;background:#f9fafb;border-radius:12px;padding:20px;box-shadow:0 4px 15px rgba(0,0,0,0.05);overflow-y:auto">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:2px solid #e5e7eb;padding-bottom:6px;position:sticky;top:-20px;background:#f9fafb;z-index:10;margin-top:-20px;padding-top:20px">
        <div style="font-size:13px;font-weight:800;color:#0b5640;text-transform:uppercase;letter-spacing:0.06em">Avance de Ejecución</div>
        <button id="${btnInfoId}" onclick="document.getElementById('${tabId}_col2').style.display='none';document.getElementById('${tabId}_col1').style.display='block';document.getElementById('${btnActsId}').classList.remove('active');" style="background:#f3f4f6;color:#4b5563;border:1px solid #d1d5db;border-radius:6px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;letter-spacing:0.05em;text-transform:uppercase;transition:all 0.2s">Volver a Info</button>
      </div>
      
      <div style="${gridStyle}">
        ${columnsHtml}
      </div>
    </div>`

  // ── PHOTO CAROUSEL (panel 1, right column bottom) ──
  const localUrls = Object.keys(allLocalPhotos)
    .filter(path => {
      const parts = path.split('/')
      const circFolder = parts[4]
      const subFolder = parts[5]
      return norm(circFolder) === norm(circuito) && norm(subFolder) === 'antes'
    })
    .map(path => allLocalPhotos[path])

  let photoStrip = ''

  if (localUrls.length === 0) {
    photoStrip = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f3f4f6;border-radius:10px;color:#9ca3af;font-size:11px;font-weight:600;letter-spacing:1px;gap:8px">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
      SIN FOTOS DEL ESTADO INICIAL
    </div>`
  } else {
    const isScroll = localUrls.length > 3
    const photosToRender = isScroll ? [...localUrls, ...localUrls] : localUrls
    photoStrip = photosToRender.map(url => `
      <div style="background:#e5e7eb;border-radius:10px;overflow:hidden;position:relative;min-width:0;flex:1;cursor:zoom-in;transition:all .3s ease;will-change:transform,opacity;opacity:0.65"
           onmouseenter="window['pause_${carouselId}']=true;this.style.transform='scale(1.05)';this.style.opacity='1';"
           onmouseleave="window['pause_${carouselId}']=false;this.style.transform='scale(1)';this.style.opacity='0.65';"
           onclick="const m=document.getElementById('modal_${carouselId}');const i=document.getElementById('img_modal_${carouselId}');if(m&&i){i.src='${url.replace('/public/', '/')}';m.style.display='flex';}">
        <img src="${url.replace('/public/', '/')}" alt="foto" style="width:100%;height:100%;object-fit:cover;display:block" onerror="this.parentElement.style.display='none'" />
        <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:9px;text-transform:uppercase;padding:5px;text-align:center;font-weight:700;letter-spacing:1px">Estado inicial</div>
      </div>`).join('')
    if (!isScroll && localUrls.length < 3)
      photoStrip += Array.from({ length: 3 - localUrls.length }).map(() => `<div style="flex:1;min-width:0"></div>`).join('')
  }

  const scrollerScript = localUrls.length > 3 ? `
    <img src="x" style="display:none" onerror="
      const wrapper=document.getElementById('${carouselId}_wrapper');
      const track=document.getElementById('${carouselId}');
      if(!track||!wrapper)return;
      const numOriginal=${localUrls.length};let idx=0;
      const w=wrapper.clientWidth;const itemW=(w-32)/3;
      for(let child of track.children){child.style.flex='0 0 '+itemW+'px';}
      track.style.opacity='1';
      const gap=16;const shift=itemW+gap;
      const t=setInterval(()=>{
        if(!document.body.contains(track)){clearInterval(t);return;}
        if(window['pause_${carouselId}'])return;
        idx++;track.style.transition='transform 0.8s cubic-bezier(0.25,1,0.5,1)';
        track.style.transform='translateX(-'+(idx*shift)+'px)';
        if(idx>=numOriginal){setTimeout(()=>{track.style.transition='none';idx=0;track.style.transform='translateX(0px)';},850);}
      },3000);" />` : `
    <img src="x" style="display:none" onerror="const track=document.getElementById('${carouselId}');if(track)track.style.opacity='1';" />`

  const photosPanel = `
    ${scrollerScript}
    <div id="${carouselId}_wrapper" style="position:absolute;left:470px;top:410px;bottom:72px;right:36px;overflow:hidden">
      <div id="${carouselId}" style="display:flex;gap:14px;height:100%;opacity:0;transition:opacity .3s;will-change:transform">${photoStrip}</div>
    </div>`

  const modalHtml = localUrls.length > 0 ? `
    <div id="modal_${carouselId}" onclick="this.style.display='none'" style="display:none;position:absolute;z-index:99999;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.82);backdrop-filter:blur(4px);align-items:center;justify-content:center;cursor:zoom-out">
      <img id="img_modal_${carouselId}" src="" style="max-width:85%;max-height:85%;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,1);object-fit:contain;border:4px solid rgba(255,255,255,0.9)" />
    </div>` : ''

  // ── EJECUCION TAB CONTENIDO MOVIDO AL PANEL DE INFO ──

  // ── TAB BAR REMOVIDO ──

  const actModalFullHtml = `
    <div id="${actModalId}" style="display:none;position:absolute;inset:0;z-index:99998;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:40px" onclick="if(event.target===this)this.style.display='none'">
      <div style="background:#fff;border-radius:16px;width:500px;max-width:100%;max-height:100%;display:flex;flex-direction:column;box-shadow:0 25px 50px rgba(0,0,0,0.5);overflow:hidden;animation:ppt-slide-next-enter-from 0.3s cubic-bezier(0.2,0.8,0.2,1) forwards">
        <div style="padding:16px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;background:#f9fafb">
          <div id="${actModalId}_title" style="font-size:15px;font-weight:800;color:#111827;line-height:1.2;margin-right:16px"></div>
          <button onclick="document.getElementById('${actModalId}').style.display='none'" style="background:rgba(0,0,0,0.05);border:none;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:22px;line-height:1;color:#6b7280;cursor:pointer;transition:background 0.2s" onmouseover="this.style.background='rgba(0,0,0,0.1)';this.style.color='#111827'" onmouseout="this.style.background='rgba(0,0,0,0.05)';this.style.color='#6b7280'">&times;</button>
        </div>
        <div style="padding:24px;overflow-y:auto;flex:1;background:#fff">
          <div id="${actModalId}_desc" style="font-size:12px;color:#4b5563;line-height:1.6;margin-bottom:20px;white-space:pre-wrap"></div>
          <div id="${actModalId}_fotos" style="display:grid;grid-template-columns:1fr 1fr;gap:12px"></div>
        </div>
      </div>
    </div>
  `

  return `
  ${pulseStyle}
  <div class="ppt-slide" style="position:relative;overflow:hidden;font-family:'Prompt',sans-serif">
    <img src="/images/presentacion/paginas.png" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block" alt=""/>
    <div style="position:absolute;inset:0">
      ${mapPanel}
      <div id="${tabId}_col1">
        ${infoPanel}
        ${photosPanel}
      </div>
      ${execPanel}
    </div>
    <div style="position:absolute;inset:0;pointer-events:none;padding:22px 36px 18px">
      <div class="seg-header-left" style="max-width:80%">
        <div class="seg-header-title">${esc(circuito)}</div>
        <div style="font-family:'Prompt',sans-serif;text-transform:uppercase;color:#ff751f;font-size:20px;font-weight:700;margin-top:2px">${lotePref}${esc(subregion)}</div>
      </div>
    </div>
    ${actModalFullHtml}
    ${modalHtml}
  </div>`
}

function buildPptClosingSlide(logoUrl) {
  return `
  <div class="ppt-slide" style="position:relative;overflow:hidden;font-family:'Prompt',sans-serif">
    <img src="/images/presentacion/fin.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block" alt=""/>
  </div>`
}

export function buildPresentacionSlides(stats, filters, logoUrl, fecha, geoFeatures = [], mpioFeatures = []) {
  const slides  = []
  const hasCir  = filters?.circuito  && filters.circuito  !== 'Todos los circuitos'
  const hasMpio = filters?.municipio && filters.municipio !== 'Todos los municipios'

  function getAvances(circuito) {
    const feats   = geoFeatures.filter(f => f.properties?.CIRCUITO === circuito)
    if (!feats.length) return { avF: 0, avFin: 0 }
    const totalKm = feats.reduce((s, f) => s + (parseFloat(f.properties.Long_km) || 0), 0) || 1
    return {
      avF:   Math.round(feats.reduce((s, f) => s + (parseFloat(f.properties.AV_FISICO) || 0) * (parseFloat(f.properties.Long_km) || 0), 0) / totalKm * 100),
      avFin: Math.round(feats.reduce((s, f) => s + (parseFloat(f.properties.AV_FINAN)  || 0) * (parseFloat(f.properties.Long_km) || 0), 0) / totalKm * 100),
    }
  }

  slides.push({ html: buildPptCoverSlide(logoUrl, fecha, filters, stats) })

  if (hasCir) {
    const vias = (stats.viasDetalle ?? []).filter(v => v.circuito === filters.circuito)
    const subr = vias[0]?.subregion ?? ''
    slides.push({ html: buildPptCircuitoSlide(logoUrl, subr, filters.circuito, vias) })
  } else {
    slides.push({ html: buildPptResumenSlide(logoUrl, stats, geoFeatures, mpioFeatures) })

    if (hasMpio) {
      const viasD    = stats.viasDetalle ?? []
      const filtered = viasD.filter(v => norm(v.municipio) === norm(filters.municipio))
      const circMap  = {}
      for (const v of filtered) {
        const c   = v.circuito || v.nombre
        const sub = v.subregion || ''
        if (!circMap[c]) circMap[c] = { sub, vias: [] }
        circMap[c].vias.push(v)
      }
      for (const [c, { sub, vias }] of Object.entries(circMap)) {
        if (vias.length) slides.push({ html: buildPptCircuitoSlide(logoUrl, sub, c, vias) })
      }
    }
  }

  // ── Slides de Seguimiento de Campo (uno por circuito con registros) ──────────
  const subOrder   = ['oriente', 'occidente', 'uraba', 'magdalena medio', 'suroeste', 'nordeste', 'bajo cauca', 'norte']
  const getSubRank = cName => {
    const cronData = cronogramasData.circuitos.find(c => norm(c.circuito) === norm(cName))
    const sub      = norm(cronData?.subregion ?? '')
    const idx      = subOrder.indexOf(sub)
    return idx === -1 ? 999 : idx
  }

  const circuitosFiltrados = hasCir
    ? [filters.circuito]
    : Object.keys(hitosData).sort((a, b) => {
        const diff = getSubRank(a) - getSubRank(b)
        return diff !== 0 ? diff : a.localeCompare(b, 'es')
      })

  for (const circuito of circuitosFiltrados) {
    const registros = hitosData[circuito]
    if (!registros?.length) continue
    const cronData       = cronogramasData.circuitos.find(c => norm(c.circuito) === norm(circuito)) ?? null
    const { avF, avFin } = getAvances(circuito)
    slides.push({ html: buildPptSeguimientoSlide(logoUrl, circuito, registros, cronData, avF, avFin, geoFeatures, mpioFeatures) })
  }

  slides.push({ html: buildPptClosingSlide(logoUrl) })

  return slides
}

// ── Entry point ──────────────────────────────────────────────────────────────
export function useReporte() {
  function generarReporte(filteredStats, activeFilters, geoFeatures = []) {
    const filters = activeFilters?.value ?? activeFilters
    const stats = filteredStats?.value ?? filteredStats
    const features = Array.isArray(geoFeatures) ? geoFeatures : (geoFeatures?.value ?? [])

    const logoUrl = window.location.origin + '/Escudo%20de%20armas.png'
    const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

    const pagesMeta = buildReportePages(stats, filters, logoUrl, fecha, features)
    const pagesHtml = pagesMeta.map(p => p.html).join('\n')
    const today = new Date().toISOString().slice(0, 10)

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
