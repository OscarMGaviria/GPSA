<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Search, ChevronUp, ChevronDown, Route, Ruler, MapPin, GitBranch } from 'lucide-vue-next'
import { calcViasAgrupadas, calcLongitudAgrupada, calcMunicipiosRows, calcCircuitosRows, avanceBadge, avanceLabel } from '../../utils/aggregations.js'

const props = defineProps({
  tipo:        { type: String, required: true }, // 'vias' | 'longitud' | 'municipios' | 'circuitos'
  viasDetalle: { type: Array,  default: () => [] },
  subregiones: { type: Array,  default: () => [] },
})

const emit = defineEmits(['close', 'open-via', 'fly-via'])

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

// Vista: Vías intervenidas (agrupado por circuito)
const viasAgrupadas    = computed(() => calcViasAgrupadas(props.viasDetalle, busqueda.value, sortKey.value, sortAsc.value))
// Vista: Longitud por municipio (agrupado con circuito y vía)
const longitudAgrupada = computed(() => calcLongitudAgrupada(props.viasDetalle, busqueda.value))
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

// ── Acordeón de municipios (vista longitud) ────────────────────────────────
const expandedMunicipios = ref(new Set())
watch(longitudAgrupada, (rows) => {
  expandedMunicipios.value = new Set(rows.map(r => r.municipio))
}, { immediate: true })
function toggleMpio(key) {
  const s = new Set(expandedMunicipios.value)
  s.has(key) ? s.delete(key) : s.add(key)
  expandedMunicipios.value = s
}
function isExpandedMpio(key) { return expandedMunicipios.value.has(key) }

// ── Acordeón de circuitos (vista vías) ────────────────────────────────────
const expandedCircuitos = ref(new Set())
watch(viasAgrupadas, (rows) => {
  expandedCircuitos.value = new Set(rows.map(r => r.circuito))
}, { immediate: true })
function toggleCircuito(key) {
  const s = new Set(expandedCircuitos.value)
  s.has(key) ? s.delete(key) : s.add(key)
  expandedCircuitos.value = s
}
function isExpanded(key) { return expandedCircuitos.value.has(key) }
function volarAlTramo(via) { emit('fly-via', via) }

// ── Expandir / colapsar todo ───────────────────────────────────────────────
const allExpanded = computed(() => {
  if (props.tipo === 'vias')     return viasAgrupadas.value.length > 0    && viasAgrupadas.value.every(r => isExpanded(r.circuito))
  if (props.tipo === 'longitud') return longitudAgrupada.value.length > 0 && longitudAgrupada.value.every(r => isExpandedMpio(r.municipio))
  return false
})
function toggleExpandAll() {
  if (props.tipo === 'vias') {
    expandedCircuitos.value = allExpanded.value ? new Set() : new Set(viasAgrupadas.value.map(r => r.circuito))
  } else if (props.tipo === 'longitud') {
    expandedMunicipios.value = allExpanded.value ? new Set() : new Set(longitudAgrupada.value.map(r => r.municipio))
  }
}

// ── Abrir detalle de vía desde circuito (vista circuitos) ─────────────────
function abrirDetalleCircuito(circuitoNombre) {
  const via = props.viasDetalle.find(v => v.circuito === circuitoNombre)
  if (via) emit('open-via', via)
}

// ── Teclado ────────────────────────────────────────────────────────────────
function onKey(e) { if (e.key === 'Escape') requestClose() }
onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
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

        <!-- Buscador -->
        <div class="search-bar">
          <Search :size="15" class="search-icon" />
          <input
            v-model="busqueda"
            type="text"
            :placeholder="`Buscar ${tipo === 'vias' ? 'circuito, vía, código o contratista' : tipo === 'longitud' ? 'municipio, circuito o vía' : tipo === 'municipios' ? 'municipio o subregión' : 'circuito o municipio'}…`"
            class="search-input"
          />
          <span v-if="busqueda" class="search-count">
            {{ tipo === 'vias' ? viasAgrupadas.length : tipo === 'longitud' ? longitudAgrupada.length : tipo === 'municipios' ? municipiosRows.length : circuitosRows.length }} resultado(s)
          </span>
          <button v-if="tipo === 'vias' || tipo === 'longitud'" class="btn-expand-all" @click="toggleExpandAll">
            <ChevronUp v-if="allExpanded" :size="13" />
            <ChevronDown v-else :size="13" />
            {{ allExpanded ? 'Colapsar todo' : 'Expandir todo' }}
          </button>
        </div>

        <!-- ── Contenido por tipo ────────────────────────────────────────── -->
        <div class="modal-body">

          <!-- VÍAS (acordeón por circuito) -->
          <template v-if="tipo === 'vias'">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="th-num th-idx">#</th>
                  <th @click="toggleSort('circuito')" class="sortable">Circuito <span class="sort-ic">{{ sortIcon('circuito') }}</span></th>
                  <th>Vía</th>
                  <th>Código</th>
                  <th @click="toggleSort('subregion')" class="sortable">Subregión <span class="sort-ic">{{ sortIcon('subregion') }}</span></th>
                  <th @click="toggleSort('km')" class="sortable th-num">Km <span class="sort-ic">{{ sortIcon('km') }}</span></th>
                  <th class="th-acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(c, i) in viasAgrupadas" :key="c.circuito">
                  <!-- Cabecera del circuito (acordeón) -->
                  <tr class="circuit-header-row" @click="toggleCircuito(c.circuito)">
                    <td class="circuit-num">{{ i + 1 }}</td>
                    <td colspan="4" class="circuit-title-cell">
                      <div class="circuit-title-wrap">
                        <Route :size="15" class="circuit-icon" />
                        <div class="circuit-title-text">
                          <span class="circuit-name">{{ c.circuito }}</span>
                          <span class="circuit-contratista">{{ c.contratista }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="td-num circuit-km-total">{{ c.km > 0 ? c.km + ' km' : '—' }}</td>
                    <td class="circuit-toggle-cell">
                      <ChevronUp v-if="isExpanded(c.circuito)" :size="15" class="chevron-ic" />
                      <ChevronDown v-else :size="15" class="chevron-ic" />
                    </td>
                  </tr>
                  <!-- Filas de vías (visibles cuando el circuito está expandido) -->
                  <template v-if="isExpanded(c.circuito)">
                    <tr v-for="v in c.vias" :key="(v.codigo || v.nombre) + c.circuito" class="via-row">
                      <td></td>
                      <td></td>
                      <td class="via-nombre-cell">
                        <span class="nombre-text">{{ v.nombre }}</span>
                      </td>
                      <td>
                        <span v-if="v.codigo" class="codigo-badge">{{ v.codigo }}</span>
                      </td>
                      <td><span class="sub-chip">{{ c.subregion }}</span></td>
                      <td class="td-num via-km">{{ v.km > 0 ? v.km + ' km' : '—' }}</td>
                      <td class="via-acciones-cell">
                        <button class="btn-ver-mapa" @click.stop="volarAlTramo(v)" title="Ver en el mapa">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      </td>
                    </tr>
                  </template>
                </template>
                <tr v-if="!viasAgrupadas.length">
                  <td colspan="7" class="empty-row">Sin resultados para "{{ busqueda }}"</td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- LONGITUD (acordeón por municipio) -->
          <template v-else-if="tipo === 'longitud'">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="th-num th-idx">#</th>
                  <th>Municipio</th>
                  <th>Circuito</th>
                  <th>Vía</th>
                  <th>Código</th>
                  <th class="th-num">Km</th>
                  <th class="th-toggle"></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(m, i) in longitudAgrupada" :key="m.municipio">
                  <tr class="mpio-header-row" @click="toggleMpio(m.municipio)">
                    <td class="mpio-num">{{ i + 1 }}</td>
                    <td colspan="4" class="mpio-title-cell">
                      <div class="mpio-title-wrap">
                        <MapPin :size="14" class="mpio-icon" />
                        <div class="mpio-title-text">
                          <span class="mpio-name">{{ m.municipio }}</span>
                          <span class="mpio-sub">{{ m.subregion }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="td-num mpio-km-total">{{ m.km }} km</td>
                    <td class="mpio-toggle-cell">
                      <ChevronUp v-if="isExpandedMpio(m.municipio)" :size="14" class="chevron-ic" />
                      <ChevronDown v-else :size="14" class="chevron-ic" />
                    </td>
                  </tr>
                  <template v-if="isExpandedMpio(m.municipio)">
                    <tr v-for="v in m.vias" :key="(v.codigo || v.nombre) + m.municipio" class="via-row">
                      <td></td>
                      <td></td>
                      <td class="via-circuito-cell">{{ v.circuito || '—' }}</td>
                      <td class="via-nombre-cell">
                        <span class="nombre-text">{{ v.nombre }}</span>
                      </td>
                      <td>
                        <span v-if="v.codigo" class="codigo-badge">{{ v.codigo }}</span>
                      </td>
                      <td class="td-num via-km">{{ v.km > 0 ? v.km + ' km' : '—' }}</td>
                      <td></td>
                    </tr>
                  </template>
                </template>
                <tr v-if="!longitudAgrupada.length">
                  <td colspan="7" class="empty-row">Sin resultados para "{{ busqueda }}"</td>
                </tr>
              </tbody>
            </table>
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
                <tr v-for="(c, i) in circuitosRows" :key="c.circuito" class="data-row data-row--dblclick"
                    :style="{ '--delay': Math.min(i * 30, 420) + 'ms' }"
                    @dblclick="abrirDetalleCircuito(c.circuito)"
                    title="Doble clic para ver detalle del tramo">
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
.btn-expand-all {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #c8e6d4;
  border-radius: 99px;
  background: #fff;
  color: #0b5640;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background .15s;
}
.btn-expand-all:hover { background: #e8f5ee; }

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
.data-row--dblclick { cursor: pointer; }
.data-row--dblclick:active { background: #e0f2ea; }
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

/* ── Vista longitud: acordeón por municipio ───────────────────────────────── */
.th-toggle { width: 44px; }
.mpio-header-row {
  background: #f8faf9;
  border-top: 2px solid #d4ead9;
  cursor: pointer;
  user-select: none;
}
.mpio-header-row:hover { background: #edf7f2; }
.mpio-num {
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #0b5640;
  width: 36px;
}
.mpio-title-cell { padding: 10px 14px; }
.mpio-title-wrap { display: flex; align-items: center; gap: 10px; }
.mpio-icon { color: #0b5640; flex-shrink: 0; }
.mpio-title-text { display: flex; flex-direction: column; gap: 2px; }
.mpio-name {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: .02em;
}
.mpio-sub { font-size: 11px; color: #6b7280; }
.mpio-km-total { font-size: 13px; font-weight: 600; color: #374151; }
.mpio-toggle-cell { text-align: center; }
.via-circuito-cell {
  font-size: 11px;
  color: #6b7280;
  max-width: 160px;
  padding-left: 18px !important;
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
/* ── Vista vías: acordeón por circuito ────────────────────────────────────── */
.th-acciones { text-align: center; width: 72px; }

/* Cabecera de circuito */
.circuit-header-row {
  background: #f8faf9;
  border-top: 2px solid #d4ead9;
  cursor: pointer;
  user-select: none;
}
.circuit-header-row:hover { background: #edf7f2; }
.circuit-num {
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #0b5640;
  width: 36px;
}
.circuit-title-cell { padding: 10px 14px; }
.circuit-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}
.circuit-icon { color: #0b5640; flex-shrink: 0; }
.circuit-title-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.circuit-name {
  font-size: 13px;
  font-weight: 700;
  color: #111827;
  text-transform: uppercase;
  letter-spacing: .02em;
  line-height: 1.2;
}
.circuit-contratista {
  font-size: 11px;
  color: #6b7280;
  font-weight: 400;
}
.circuit-km-total {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.circuit-toggle-cell {
  text-align: center;
  width: 44px;
}
.chevron-ic { color: #0b5640; }

/* Filas de vía */
.via-row { background: #fff; border-bottom: 1px solid #f0f4f2; }
.via-row:hover { background: #f9fdfb; }
.via-nombre-cell { padding-left: 18px !important; max-width: 220px; }
.via-km { color: #374151; }

/* Botón ojo */
.via-acciones-cell { text-align: center; }
.btn-ver-mapa {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: #e8f5ee;
  color: #0b5640;
  cursor: pointer;
  transition: background .15s, transform .1s;
}
.btn-ver-mapa:hover { background: #c7e9d5; }
.btn-ver-mapa:active { transform: scale(0.92); }

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
