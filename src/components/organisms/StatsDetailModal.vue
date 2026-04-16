<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Search, ChevronUp, ChevronDown, Route, Ruler, MapPin, GitBranch } from 'lucide-vue-next'
import { groupViasFiltered, calcLongitudRows, calcMunicipiosRows, calcCircuitosRows, avanceBadge, avanceLabel } from '../../utils/aggregations.js'

const props = defineProps({
  tipo:        { type: String, required: true }, // 'vias' | 'longitud' | 'municipios' | 'circuitos'
  viasDetalle: { type: Array,  default: () => [] },
  subregiones: { type: Array,  default: () => [] },
})

const emit = defineEmits(['close'])

// ── Visibilidad con animación de salida ───────────────────────────────────
const visible = ref(true)
function requestClose() { visible.value = false }
function onAfterLeave() { emit('close') }

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
const viasFiltered  = computed(() => groupViasFiltered(props.viasDetalle, busqueda.value, sortKey.value, sortAsc.value))
// Vista: Longitud por municipio
const longitudRows  = computed(() => calcLongitudRows(props.viasDetalle))
// Vista: Municipios
const municipiosRows = computed(() => calcMunicipiosRows(props.viasDetalle, busqueda.value, sortKey.value === 'nombre' ? 'km' : sortKey.value, sortKey.value === 'nombre' ? false : sortAsc.value))
// Vista: Circuitos
const circuitosRows = computed(() => calcCircuitosRows(props.viasDetalle, busqueda.value, sortKey.value, sortAsc.value))

// ── Config por tipo ────────────────────────────────────────────────────────
const CONFIG = {
  vias:       { titulo: 'Vías intervenidas', icono: Route,    desc: 'Listado completo de tramos de vía incluidos en el programa' },
  longitud:   { titulo: 'Longitud total',    icono: Ruler,    desc: 'Distribución de kilómetros por subregión del departamento' },
  municipios: { titulo: 'Municipios',        icono: MapPin,   desc: 'Resumen de intervención agrupado por municipio' },
  circuitos:  { titulo: 'Circuitos viales',  icono: GitBranch,desc: 'Circuitos viales con tramos, longitud y avance de obra' },
}
const cfg = computed(() => CONFIG[props.tipo] ?? CONFIG.vias)

// ── Helpers ────────────────────────────────────────────────────────────────
function sortIcon(key) { return sortKey.value === key ? (sortAsc.value ? '↑' : '↓') : '' }

// ── Animación de barras + count-up (longitud) ─────────────────────────────
const barsVisible = ref(false)
const animLong    = ref([])   // [{ km: 0, pct: 0 }, ...]
let barsTimer = null

watch(barsVisible, (val) => {
  if (!val) return
  const rows = longitudRows.value
  animLong.value = rows.map(() => ({ km: 0, pct: 0 }))
  rows.forEach((row, i) => {
    setTimeout(() => {
      const dur = 650, s = performance.now()
      ;(function step(now) {
        const t = Math.min((now - s) / dur, 1)
        const e = 1 - Math.pow(1 - t, 3)
        animLong.value[i].km  = row.km      * e
        animLong.value[i].pct = row.pctReal * e
        if (t < 1) requestAnimationFrame(step)
        else { animLong.value[i].km = row.km; animLong.value[i].pct = row.pctReal }
      }(performance.now()))
    }, i * 55)
  })
})

// ── Teclado ────────────────────────────────────────────────────────────────
function onKey(e) { if (e.key === 'Escape') requestClose() }
onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
  // Esperar que la animación de entrada del modal termine (~220ms) antes de llenar barras
  barsTimer = setTimeout(() => { barsVisible.value = true }, 280)
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
  clearTimeout(barsTimer)
})
</script>

<template>
  <teleport to="body">
    <Transition name="modal-anim" @after-leave="onAfterLeave">
    <div v-if="visible" class="modal-backdrop" @click.self="requestClose">
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
          <button class="btn-close" @click="requestClose" aria-label="Cerrar">✕</button>
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
                  <th class="th-num th-idx">#</th>
                  <th @click="toggleSort('nombre')" class="sortable">Nombre <span class="sort-ic">{{ sortIcon('nombre') }}</span></th>
                  <th @click="toggleSort('municipio')" class="sortable">Municipio <span class="sort-ic">{{ sortIcon('municipio') }}</span></th>
                  <th @click="toggleSort('subregion')" class="sortable">Subregión <span class="sort-ic">{{ sortIcon('subregion') }}</span></th>
                  <th @click="toggleSort('km')" class="sortable th-num">Km <span class="sort-ic">{{ sortIcon('km') }}</span></th>
                  <th>Contratista</th>
                </tr>
              </thead>
              <TransitionGroup name="row" tag="tbody">
                <tr v-for="(v, i) in viasFiltered" :key="v.codigo || v.nombre" class="data-row"
                    :style="{ '--delay': Math.min(i * 30, 420) + 'ms' }">
                  <td class="td-num td-idx">{{ i + 1 }}</td>
                  <td class="td-nombre">
                    <span class="nombre-text">{{ v.nombre }}</span>
                    <span v-if="v.codigo" class="codigo-badge">{{ v.codigo }}</span>
                  </td>
                  <td>{{ v.municipio || '—' }}</td>
                  <td><span class="sub-chip">{{ v.subregion }}</span></td>
                  <td class="td-num">{{ v.km > 0 ? v.km + ' km' : '—' }}</td>
                  <td class="td-contratista">{{ v.contratista || '—' }}</td>
                </tr>
                <tr v-if="!viasFiltered.length" key="__empty">
                  <td colspan="6" class="empty-row">Sin resultados para "{{ busqueda }}"</td>
                </tr>
              </TransitionGroup>
            </table>
          </template>

          <!-- LONGITUD -->
          <template v-else-if="tipo === 'longitud'">
            <div class="longitud-grid">
              <div v-for="(row, i) in longitudRows" :key="row.name" class="longitud-row">
                <div class="long-header">
                  <div class="long-name-wrap">
                    <span class="long-name">{{ row.name }}</span>
                    <span class="long-sub">{{ row.subregion }}</span>
                  </div>
                  <span class="long-km">{{ animLong[i] ? animLong[i].km.toFixed(2) : row.km }} km</span>
                  <span class="long-pct">{{ animLong[i] ? Math.round(animLong[i].pct) : row.pctReal }}%</span>
                </div>
                <div class="long-bar-track">
                  <div
                    class="long-bar-fill"
                    :style="{
                      transform: 'scaleX(' + (barsVisible ? row.pctReal / 100 : 0) + ')',
                      transitionDelay: barsVisible ? (i * 55) + 'ms' : '0ms'
                    }"
                  />
                </div>
              </div>
              <div v-if="!longitudRows.length" class="empty-row">Sin datos disponibles.</div>
            </div>
          </template>

          <!-- MUNICIPIOS -->
          <template v-else-if="tipo === 'municipios'">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="th-num th-idx">#</th>
                  <th @click="toggleSort('nombre')" class="sortable">Municipio <span class="sort-ic">{{ sortIcon('nombre') }}</span></th>
                  <th @click="toggleSort('subregion')" class="sortable">Subregión <span class="sort-ic">{{ sortIcon('subregion') }}</span></th>
                  <th @click="toggleSort('vias')" class="sortable th-num">Vías <span class="sort-ic">{{ sortIcon('vias') }}</span></th>
                  <th @click="toggleSort('km')" class="sortable th-num">Longitud <span class="sort-ic">{{ sortIcon('km') }}</span></th>
                </tr>
              </thead>
              <TransitionGroup name="row" tag="tbody">
                <tr v-for="(m, i) in municipiosRows" :key="m.nombre" class="data-row"
                    :style="{ '--delay': Math.min(i * 30, 420) + 'ms' }">
                  <td class="td-num td-idx">{{ i + 1 }}</td>
                  <td class="td-nombre">{{ m.nombre || '—' }}</td>
                  <td><span class="sub-chip">{{ m.subregion }}</span></td>
                  <td class="td-num">{{ m.vias }}</td>
                  <td class="td-num">{{ m.km }} km</td>
                </tr>
                <tr v-if="!municipiosRows.length" key="__empty">
                  <td colspan="5" class="empty-row">Sin resultados para "{{ busqueda }}"</td>
                </tr>
              </TransitionGroup>
            </table>
          </template>

          <!-- CIRCUITOS -->
          <template v-else-if="tipo === 'circuitos'">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="th-num th-idx">#</th>
                  <th @click="toggleSort('circuito')" class="sortable">Circuito <span class="sort-ic">{{ sortIcon('circuito') }}</span></th>
                  <th @click="toggleSort('municipio')" class="sortable">Municipio <span class="sort-ic">{{ sortIcon('municipio') }}</span></th>
                  <th @click="toggleSort('subregion')" class="sortable">Subregión <span class="sort-ic">{{ sortIcon('subregion') }}</span></th>
                  <th @click="toggleSort('km')" class="sortable th-num">Km <span class="sort-ic">{{ sortIcon('km') }}</span></th>
                  <th>Contratista</th>
                </tr>
              </thead>
              <TransitionGroup name="row" tag="tbody">
                <tr v-for="(c, i) in circuitosRows" :key="c.circuito" class="data-row"
                    :style="{ '--delay': Math.min(i * 30, 420) + 'ms' }">
                  <td class="td-num td-idx">{{ i + 1 }}</td>
                  <td class="td-nombre">{{ c.circuito || '—' }}</td>
                  <td>{{ c.municipio || '—' }}</td>
                  <td><span class="sub-chip">{{ c.subregion }}</span></td>
                  <td class="td-num">{{ c.km > 0 ? c.km + ' km' : '—' }}</td>
                  <td class="td-contratista">{{ c.contratista || '—' }}</td>
                </tr>
                <tr v-if="!circuitosRows.length" key="__empty">
                  <td colspan="6" class="empty-row">Sin resultados para "{{ busqueda }}"</td>
                </tr>
              </TransitionGroup>
            </table>
          </template>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <span class="footer-hint">Presiona <kbd>Esc</kbd> para cerrar</span>
          <button class="btn-cerrar" @click="requestClose">Cerrar</button>
        </div>

      </div>
    </div>
    </Transition>
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
}

/* ── Transición entrada/salida ────────────────────────────────────────────── */
.modal-anim-enter-active {
  transition: opacity 0.2s ease;
}
.modal-anim-leave-active {
  transition: opacity 0.18s ease;
}
.modal-anim-enter-from,
.modal-anim-leave-to {
  opacity: 0;
}
.modal-anim-enter-active .modal {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.34, 1.1, 0.64, 1);
}
.modal-anim-leave-active .modal {
  transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.4, 0, 1, 1);
}
.modal-anim-enter-from .modal,
.modal-anim-leave-to .modal {
  opacity: 0;
  transform: translateY(24px) scale(0.97);
}

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
  overflow: hidden;
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
  border: 2px solid rgba(255,255,255,.55);
  background: rgba(255,255,255,.18);
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .18s ease-out, transform 0.1s ease-out;
}
.btn-close:active { transform: scale(0.93); }
@media (hover: hover) and (pointer: fine) {
  .btn-close:hover { background: rgba(255,255,255,.32); border-color: #fff; }
}

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
.th-idx { width: 32px; text-align: center; color: #9ca3af; font-weight: 500; }
.td-idx { text-align: center; color: #d1d5db; font-size: 11px; font-weight: 600; }
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
.long-name-wrap { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.long-name { font-size: 13px; font-weight: 600; color: #1f2937; }
.long-sub  { font-size: 10px; color: #9ca3af; font-weight: 500; }
.long-km   { font-size: 14px; font-weight: 700; color: #0b5640; }
.long-pct  { font-size: 12px; color: #6b7280; min-width: 36px; text-align: right; }
.long-bar-track {
  height: 10px;
  background: #e5f0ea;
  border-radius: 99px;
  overflow: hidden;
}
.long-bar-fill {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #3fad72, #0b5640);
  border-radius: 99px;
  transform-origin: left;
  transition: transform 0.65s cubic-bezier(0.23, 1, 0.32, 1);
}
@media (prefers-reduced-motion: reduce) {
  .long-bar-fill { transition: none; }
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
  transition: opacity .18s ease-out, transform 0.1s ease-out;
}
.btn-cerrar:active { transform: scale(0.97); }
@media (hover: hover) and (pointer: fine) {
  .btn-cerrar:hover { opacity: .88; }
}
/* ── TransitionGroup filas ────────────────────────────────────────────────── */
.row-enter-active {
  transition: opacity 0.22s ease-out, transform 0.22s ease-out;
  transition-delay: var(--delay, 0ms);
}
.row-enter-from { opacity: 0; transform: translateY(5px); }
.row-move       { transition: transform 0.28s cubic-bezier(0.23, 1, 0.32, 1); }

@media (prefers-reduced-motion: reduce) {
  .modal-anim-enter-active,
  .modal-anim-leave-active,
  .modal-anim-enter-active .modal,
  .modal-anim-leave-active .modal { transition: none; }
  .btn-close:active,
  .btn-cerrar:active { transform: none; }
  .row-enter-active, .row-move { transition: none; }
  .long-bar-fill { transition: none; }
}
</style>
