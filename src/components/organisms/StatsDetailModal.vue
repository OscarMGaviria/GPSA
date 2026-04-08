<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { X, Search, ChevronUp, ChevronDown, Route, Ruler, MapPin, GitBranch } from 'lucide-vue-next'

const props = defineProps({
  tipo:        { type: String, required: true }, // 'vias' | 'longitud' | 'municipios' | 'circuitos'
  viasDetalle: { type: Array,  default: () => [] },
  subregiones: { type: Array,  default: () => [] },
})

const emit = defineEmits(['close'])

// ── Búsqueda y ordenamiento ────────────────────────────────────────────────
const busqueda  = ref('')
const sortKey   = ref('nombre')
const sortAsc   = ref(true)

function toggleSort(key) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else { sortKey.value = key; sortAsc.value = true }
}

// ── Datos derivados por tipo ───────────────────────────────────────────────

// Vista: Vías intervenidas
const viasFiltered = computed(() => {
  const q = busqueda.value.toLowerCase()
  const lista = q
    ? props.viasDetalle.filter(v =>
        v.nombre.toLowerCase().includes(q) ||
        v.municipio.toLowerCase().includes(q) ||
        v.subregion.toLowerCase().includes(q) ||
        v.contratista.toLowerCase().includes(q)
      )
    : [...props.viasDetalle]

  return lista.sort((a, b) => {
    const va = a[sortKey.value] ?? ''
    const vb = b[sortKey.value] ?? ''
    const cmp = typeof va === 'number'
      ? va - vb
      : String(va).localeCompare(String(vb), 'es')
    return sortAsc.value ? cmp : -cmp
  })
})

// Vista: Longitud por subregión
const longitudRows = computed(() => {
  const total = props.subregiones.reduce((s, r) => s + r.km, 0) || 1
  return [...props.subregiones]
    .filter(r => r.km > 0)
    .sort((a, b) => b.km - a.km)
    .map(r => ({ ...r, pctReal: Math.round((r.km / total) * 100) }))
})

// Vista: Municipios — agrupar vías por municipio
const municipiosRows = computed(() => {
  const map = {}
  for (const v of props.viasDetalle) {
    const key = v.municipio || 'Sin municipio'
    if (!map[key]) map[key] = { nombre: key, subregion: v.subregion, vias: 0, km: 0, avanceSum: 0 }
    map[key].vias++
    map[key].km       += v.km
    map[key].avanceSum += v.avance
  }
  const rows = Object.values(map).map(r => ({
    ...r,
    km:     Math.round(r.km * 100) / 100,
    avance: r.vias ? Math.round((r.avanceSum / r.vias) * 10) / 10 : 0,
  }))

  const q = busqueda.value.toLowerCase()
  const filtered = q ? rows.filter(r =>
    r.nombre.toLowerCase().includes(q) || r.subregion.toLowerCase().includes(q)
  ) : rows

  return filtered.sort((a, b) => {
    const va = a[sortKey.value] ?? ''
    const vb = b[sortKey.value] ?? ''
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
    return sortAsc.value ? cmp : -cmp
  })
})

// Vista: Circuitos — igual que vías pero agrupado por circuito
const circuitosRows = computed(() => {
  const map = {}
  for (const v of props.viasDetalle) {
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

  const q = busqueda.value.toLowerCase()
  const filtered = q ? rows.filter(r =>
    r.circuito.toLowerCase().includes(q) ||
    r.municipio.toLowerCase().includes(q) ||
    r.subregion.toLowerCase().includes(q)
  ) : rows

  return filtered.sort((a, b) => {
    const va = a[sortKey.value] ?? ''
    const vb = b[sortKey.value] ?? ''
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
    return sortAsc.value ? cmp : -cmp
  })
})

// ── Config por tipo ────────────────────────────────────────────────────────
const CONFIG = {
  vias:       { titulo: 'Vías intervenidas', icono: Route,    desc: 'Listado completo de tramos de vía incluidos en el programa' },
  longitud:   { titulo: 'Longitud total',    icono: Ruler,    desc: 'Distribución de kilómetros por subregión del departamento' },
  municipios: { titulo: 'Municipios',        icono: MapPin,   desc: 'Resumen de intervención agrupado por municipio' },
  circuitos:  { titulo: 'Circuitos viales',  icono: GitBranch,desc: 'Circuitos viales con tramos, longitud y avance de obra' },
}
const cfg = computed(() => CONFIG[props.tipo] ?? CONFIG.vias)

// ── Helpers ────────────────────────────────────────────────────────────────
function avanceBadge(pct) {
  if (pct === 0)   return 'badge--pending'
  if (pct >= 100)  return 'badge--done'
  return 'badge--active'
}
function avanceLabel(pct) {
  if (pct === 0)  return 'Sin iniciar'
  if (pct >= 100) return 'Finalizado'
  return 'En obra'
}

function sortIcon(key) { return sortKey.value === key ? (sortAsc.value ? '↑' : '↓') : '' }

// ── Teclado ────────────────────────────────────────────────────────────────
function onKey(e) { if (e.key === 'Escape') emit('close') }
onMounted(()  => { document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden' })
onUnmounted(() => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' })
</script>

<template>
  <teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')">
      <div class="modal" role="dialog" :aria-label="cfg.titulo">

        <!-- Header -->
        <div class="modal-header">
          <div class="header-left">
            <div class="header-icon">
              <component :is="cfg.icono" :size="20" />
            </div>
            <div>
              <h2 class="modal-titulo">{{ cfg.titulo }}</h2>
              <p class="modal-desc">{{ cfg.desc }}</p>
            </div>
          </div>
          <button class="btn-close" @click="emit('close')" aria-label="Cerrar">
            <X :size="18" />
          </button>
        </div>

        <!-- Buscador (no aplica a longitud) -->
        <div v-if="tipo !== 'longitud'" class="search-bar">
          <Search :size="15" class="search-icon" />
          <input
            v-model="busqueda"
            type="text"
            :placeholder="`Buscar ${tipo === 'vias' ? 'vía, municipio o contratista' : tipo === 'municipios' ? 'municipio o subregión' : 'circuito o municipio'}…`"
            class="search-input"
          />
          <span v-if="busqueda" class="search-count">
            {{ tipo === 'vias' ? viasFiltered.length : tipo === 'municipios' ? municipiosRows.length : circuitosRows.length }} resultado(s)
          </span>
        </div>

        <!-- ── Contenido por tipo ────────────────────────────────────────── -->
        <div class="modal-body">

          <!-- VÍAS -->
          <template v-if="tipo === 'vias'">
            <table class="data-table">
              <thead>
                <tr>
                  <th @click="toggleSort('nombre')" class="sortable">Nombre <span class="sort-ic">{{ sortIcon('nombre') }}</span></th>
                  <th @click="toggleSort('municipio')" class="sortable">Municipio <span class="sort-ic">{{ sortIcon('municipio') }}</span></th>
                  <th @click="toggleSort('subregion')" class="sortable">Subregión <span class="sort-ic">{{ sortIcon('subregion') }}</span></th>
                  <th @click="toggleSort('km')" class="sortable th-num">Km <span class="sort-ic">{{ sortIcon('km') }}</span></th>
                  <th @click="toggleSort('avance')" class="sortable th-num">Avance <span class="sort-ic">{{ sortIcon('avance') }}</span></th>
                  <th>Contratista</th>
                  <th>Inicio</th>
                  <th>Plazo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in viasFiltered" :key="v.codigo || v.nombre" class="data-row">
                  <td class="td-nombre">
                    <span class="nombre-text">{{ v.nombre }}</span>
                    <span v-if="v.codigo" class="codigo-badge">{{ v.codigo }}</span>
                  </td>
                  <td>{{ v.municipio || '—' }}</td>
                  <td>
                    <span class="sub-chip">{{ v.subregion }}</span>
                  </td>
                  <td class="td-num">{{ v.km > 0 ? v.km + ' km' : '—' }}</td>
                  <td class="td-num">
                    <div class="avance-cell">
                      <span class="avance-badge" :class="avanceBadge(v.avance)">{{ avanceLabel(v.avance) }}</span>
                      <div class="mini-bar-wrap">
                        <div class="mini-bar" :style="{ width: v.avance + '%' }" />
                      </div>
                      <span class="avance-pct">{{ v.avance }}%</span>
                    </div>
                  </td>
                  <td class="td-contratista">{{ v.contratista || '—' }}</td>
                  <td class="td-fecha">{{ v.fechaInicio || '—' }}</td>
                  <td>{{ v.plazo || '—' }}</td>
                </tr>
                <tr v-if="!viasFiltered.length">
                  <td colspan="8" class="empty-row">Sin resultados para "{{ busqueda }}"</td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- LONGITUD -->
          <template v-else-if="tipo === 'longitud'">
            <div class="longitud-grid">
              <div v-for="row in longitudRows" :key="row.name" class="longitud-row">
                <div class="long-header">
                  <span class="long-name">{{ row.name }}</span>
                  <span class="long-km">{{ row.km }} km</span>
                  <span class="long-pct">{{ row.pctReal }}%</span>
                </div>
                <div class="long-bar-track">
                  <div class="long-bar-fill" :style="{ width: row.pctReal + '%' }" />
                </div>
              </div>
              <div v-if="!longitudRows.length" class="empty-row">Sin datos de subregión disponibles.</div>
            </div>
          </template>

          <!-- MUNICIPIOS -->
          <template v-else-if="tipo === 'municipios'">
            <table class="data-table">
              <thead>
                <tr>
                  <th @click="toggleSort('nombre')" class="sortable">Municipio <span class="sort-ic">{{ sortIcon('nombre') }}</span></th>
                  <th @click="toggleSort('subregion')" class="sortable">Subregión <span class="sort-ic">{{ sortIcon('subregion') }}</span></th>
                  <th @click="toggleSort('vias')" class="sortable th-num">Vías <span class="sort-ic">{{ sortIcon('vias') }}</span></th>
                  <th @click="toggleSort('km')" class="sortable th-num">Longitud <span class="sort-ic">{{ sortIcon('km') }}</span></th>
                  <th @click="toggleSort('avance')" class="sortable th-num">Avance prom. <span class="sort-ic">{{ sortIcon('avance') }}</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in municipiosRows" :key="m.nombre" class="data-row">
                  <td class="td-nombre">{{ m.nombre || '—' }}</td>
                  <td><span class="sub-chip">{{ m.subregion }}</span></td>
                  <td class="td-num">{{ m.vias }}</td>
                  <td class="td-num">{{ m.km }} km</td>
                  <td class="td-num">
                    <div class="avance-cell">
                      <div class="mini-bar-wrap">
                        <div class="mini-bar" :style="{ width: m.avance + '%' }" />
                      </div>
                      <span class="avance-pct">{{ m.avance }}%</span>
                    </div>
                  </td>
                </tr>
                <tr v-if="!municipiosRows.length">
                  <td colspan="5" class="empty-row">Sin resultados para "{{ busqueda }}"</td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- CIRCUITOS -->
          <template v-else-if="tipo === 'circuitos'">
            <table class="data-table">
              <thead>
                <tr>
                  <th @click="toggleSort('circuito')" class="sortable">Circuito <span class="sort-ic">{{ sortIcon('circuito') }}</span></th>
                  <th @click="toggleSort('municipio')" class="sortable">Municipio <span class="sort-ic">{{ sortIcon('municipio') }}</span></th>
                  <th @click="toggleSort('subregion')" class="sortable">Subregión <span class="sort-ic">{{ sortIcon('subregion') }}</span></th>
                  <th @click="toggleSort('km')" class="sortable th-num">Km <span class="sort-ic">{{ sortIcon('km') }}</span></th>
                  <th @click="toggleSort('avance')" class="sortable th-num">Avance <span class="sort-ic">{{ sortIcon('avance') }}</span></th>
                  <th>Contratista</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in circuitosRows" :key="c.circuito" class="data-row">
                  <td class="td-nombre">{{ c.circuito || '—' }}</td>
                  <td>{{ c.municipio || '—' }}</td>
                  <td><span class="sub-chip">{{ c.subregion }}</span></td>
                  <td class="td-num">{{ c.km > 0 ? c.km + ' km' : '—' }}</td>
                  <td class="td-num">
                    <div class="avance-cell">
                      <span class="avance-badge" :class="avanceBadge(c.avance)">{{ avanceLabel(c.avance) }}</span>
                      <div class="mini-bar-wrap">
                        <div class="mini-bar" :style="{ width: c.avance + '%' }" />
                      </div>
                      <span class="avance-pct">{{ c.avance }}%</span>
                    </div>
                  </td>
                  <td class="td-contratista">{{ c.contratista || '—' }}</td>
                </tr>
                <tr v-if="!circuitosRows.length">
                  <td colspan="6" class="empty-row">Sin resultados para "{{ busqueda }}"</td>
                </tr>
              </tbody>
            </table>
          </template>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <span class="footer-hint">Presiona <kbd>Esc</kbd> para cerrar</span>
          <button class="btn-cerrar" @click="emit('close')">Cerrar</button>
        </div>

      </div>
    </div>
  </teleport>
</template>

<style scoped>
/* ── Backdrop ─────────────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 30, 20, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn .18s ease both;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

/* ── Modal shell ──────────────────────────────────────────────────────────── */
.modal {
  background: #fff;
  border-radius: 20px;
  width: min(96vw, 1060px);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 24px 80px rgba(11, 86, 64, .22),
    0 6px 20px rgba(0, 0, 0, .14);
  animation: slideUp .22s cubic-bezier(.34,1.1,.64,1) both;
  overflow: hidden;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px) scale(.97) }
  to   { opacity: 1; transform: translateY(0)    scale(1)   }
}

/* ── Header ───────────────────────────────────────────────────────────────── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px 16px;
  background: linear-gradient(135deg, #0b5640 0%, #1a7a56 100%);
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.header-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(255,255,255,.18);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.modal-titulo {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  line-height: 1.2;
}
.modal-desc {
  font-size: 12px;
  color: rgba(255,255,255,.7);
  margin: 2px 0 0;
}
.btn-close {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: rgba(255,255,255,.18);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .18s;
}
.btn-close:hover { background: rgba(255,255,255,.32); }

/* ── Search bar ───────────────────────────────────────────────────────────── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: #f8faf9;
  border-bottom: 1px solid #e5ede9;
  flex-shrink: 0;
}
.search-icon { color: #6b7280; flex-shrink: 0; }
.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #1f2937;
  outline: none;
}
.search-input::placeholder { color: #9ca3af; }
.search-count {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

/* ── Body ─────────────────────────────────────────────────────────────────── */
.modal-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 0;
}

/* ── Tabla ────────────────────────────────────────────────────────────────── */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table thead tr {
  background: #f0f7f3;
  position: sticky;
  top: 0;
  z-index: 2;
}
.data-table th {
  padding: 11px 14px;
  font-size: 11px;
  font-weight: 700;
  color: #374151;
  letter-spacing: .04em;
  text-transform: uppercase;
  text-align: left;
  white-space: nowrap;
  border-bottom: 2px solid #c8e6d4;
  user-select: none;
}
.data-table th.sortable { cursor: pointer; }
.data-table th.sortable:hover { background: #dff0e8; }
.th-num { text-align: right; }
.sort-ic { color: #2d8653; font-size: 12px; margin-left: 2px; }

.data-row { border-bottom: 1px solid #f0f4f2; transition: background .12s; }
.data-row:hover { background: #f5fbf7; }
.data-table td { padding: 10px 14px; color: #374151; vertical-align: middle; }
.td-num { text-align: right; font-variant-numeric: tabular-nums; }
.td-nombre {
  max-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.nombre-text { font-weight: 600; color: #1f2937; line-height: 1.3; }
.codigo-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 1px 6px;
  border-radius: 4px;
  width: fit-content;
}
.sub-chip {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  color: #0b5640;
  background: #e0f2ea;
  padding: 2px 8px;
  border-radius: 99px;
  white-space: nowrap;
}
.td-contratista { font-size: 12px; color: #4b5563; max-width: 180px; }
.td-fecha { font-size: 12px; color: #6b7280; white-space: nowrap; }
.empty-row { text-align: center; color: #9ca3af; padding: 32px 16px; font-style: italic; }

/* ── Avance cell ──────────────────────────────────────────────────────────── */
.avance-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: flex-end;
}
.avance-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 99px;
  white-space: nowrap;
}
.badge--pending { background: #f3f4f6; color: #6b7280; }
.badge--active  { background: #fef3c7; color: #d97706; }
.badge--done    { background: #d1fae5; color: #059669; }
.mini-bar-wrap {
  width: 52px;
  height: 5px;
  background: #e5e7eb;
  border-radius: 99px;
  overflow: hidden;
  flex-shrink: 0;
}
.mini-bar {
  height: 100%;
  background: linear-gradient(90deg, #2d8653, #0b5640);
  border-radius: 99px;
  transition: width .4s ease;
}
.avance-pct { font-size: 12px; font-weight: 700; color: #374151; min-width: 32px; text-align: right; }

/* ── Vista longitud ───────────────────────────────────────────────────────── */
.longitud-grid { padding: 24px; display: flex; flex-direction: column; gap: 18px; }
.longitud-row {}
.long-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}
.long-name { font-size: 14px; font-weight: 600; color: #1f2937; flex: 1; }
.long-km   { font-size: 14px; font-weight: 700; color: #0b5640; }
.long-pct  { font-size: 12px; color: #6b7280; min-width: 36px; text-align: right; }
.long-bar-track {
  height: 10px;
  background: #e5f0ea;
  border-radius: 99px;
  overflow: hidden;
}
.long-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3fad72, #0b5640);
  border-radius: 99px;
  transition: width .6s cubic-bezier(.34,1.1,.64,1);
}

/* ── Footer ───────────────────────────────────────────────────────────────── */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-top: 1px solid #e5ede9;
  background: #f8faf9;
  flex-shrink: 0;
}
.footer-hint { font-size: 12px; color: #9ca3af; }
kbd {
  display: inline-block;
  padding: 1px 5px;
  font-size: 11px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  color: #374151;
}
.btn-cerrar {
  padding: 8px 22px;
  background: linear-gradient(135deg, #0b5640, #1a7a56);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity .18s;
}
.btn-cerrar:hover { opacity: .88; }
</style>
