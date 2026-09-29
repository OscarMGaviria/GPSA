// Convierte el reporte de gestión predial (texto tabulado exportado de Excel)
// en public/data/Capas/datos_predial.json, que el visor cruza por matrícula
// con la capa Area_Intervenidas_Visor.
//
// Uso: node public/data/parse_reporte_predial.cjs <Reporte.txt>
//
// Las cédulas de personas naturales no se publican: solo se conserva el NIT
// de personas jurídicas (9 dígitos iniciando en 8 o 9).
const fs = require('fs');
const path = require('path');

const input = process.argv[2];
if (!input) {
  console.error('Uso: node parse_reporte_predial.cjs <Reporte.txt>');
  process.exit(1);
}
const output = path.join(__dirname, 'Capas', 'datos_predial.json');

// Claves alineadas con las propiedades de Area_Intervenidas_Visor.geojson
const COLUMNS = [
  'Proyecto', 'Fuente_Financiacion', 'Matricula', 'Propietario', 'NIT_CC',
  'Permiso_Intervencion', 'Area_Total', 'Area_Afectar', 'Abscisa_Inicial', 'Abscisa_Final',
  'Oferta', 'Fecha_Oferta', 'Modificacion_Oferta', 'Rechazo_Oferta', 'Aceptacion_Oferta',
  'Fecha_Notificacion', 'Proceso_Expropiacion', 'Fecha_Notificacion_Expropiacion',
  'Estado_Proyecto', 'Aprovechamientos_Forestales'
];

// Campos donde los saltos de línea separan elementos de una lista
const LIST_FIELDS = new Set(['Propietario', 'Oferta', 'Fecha_Oferta', 'Modificacion_Oferta', 'Aceptacion_Oferta', 'Fecha_Notificacion', 'Proceso_Expropiacion'])

// Parser TSV con soporte de celdas entre comillas (saltos de línea y "" escapadas)
function parseTsv(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') inQuotes = true;
    else if (ch === '\t') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function clean(key, value) {
  let v = (value || '').replace(/ /g, ' ');
  if (LIST_FIELDS.has(key)) {
    v = v.split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).join('; ');
  } else {
    v = v.split('\n').map(s => s.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  return v === '' ? null : v;
}

function isNit(v) {
  const digits = String(v).replace(/[^0-9]/g, '');
  return /^[89]\d{8}\d?$/.test(digits);
}

const rows = parseTsv(fs.readFileSync(input, 'utf8'));
const records = [];
for (const raw of rows.slice(1)) {
  if (raw.every(c => c.trim() === '')) continue;
  const rec = {};
  COLUMNS.forEach((key, i) => { rec[key] = clean(key, raw[i]); });
  if (!rec.Proyecto) continue;
  if (rec.NIT_CC && !isNit(rec.NIT_CC)) rec.NIT_CC = null;
  if (rec.Permiso_Intervencion) rec.Permiso_Intervencion = rec.Permiso_Intervencion.toUpperCase();
  records.push(rec);
}

fs.writeFileSync(output, JSON.stringify(records, null, 2) + '\n');
const proyectos = new Set(records.map(r => r.Proyecto));
console.log(`${records.length} registros de ${proyectos.size} proyectos → ${output}`);
