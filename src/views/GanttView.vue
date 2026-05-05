<script setup>
import { ref, computed } from 'vue'
import cronogramas from '../data/cronogramas.json'

const circuitos  = cronogramas.circuitos
const busqueda   = ref('')
const selectedId = ref(circuitos[0]?.id ?? null)

const filtrados = computed(() => {
  const q = busqueda.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (!q) return circuitos
  return circuitos.filter(c =>
    c.circuito.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
    c.municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
  )
})

const circuito = computed(() => circuitos.find(c => c.id === selectedId.value) ?? null)

// Genera columnas de meses a partir de fecha_inicio (DD/MM/YYYY) + plazo
function generarMeses(fechaIni, plazoMeses) {
  const [d, m, y] = fechaIni.split('/')
  const inicio = new Date(parseInt(y), parseInt(m) - 1, 1)
  return Array.from({ length: plazoMeses }, (_, i) => {
    const fecha = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1)
    const lbl   = fecha.toLocaleDateString('es-CO', { month: 'short' })
    return {
      idx:  i + 1,
      mes:  lbl.charAt(0).toUpperCase() + lbl.slice(1).replace('.', ''),
      anio: fecha.getFullYear(),
    }
  })
}

const meses = computed(() =>
  circuito.value ? generarMeses(circuito.value.fecha_inicio, circuito.value.plazo_meses) : []
)

// Estado de una celda para una actividad dada
function estadoCelda(mesIdx, act) {
  const fin = act.inicio_mes + act.duracion_meses - 1
  if (mesIdx < act.inicio_mes || mesIdx > fin) return 'empty'
  const mesesHechos  = Math.round((act.avance_pct / 100) * act.duracion_meses)
  const posEnAct     = mesIdx - act.inicio_mes + 1
  return posEnAct <= mesesHechos ? 'done' : 'planned'
}

function imprimir() { window.print() }
</script>

<template>
  <div class="g-root">

    <!-- ── Encabezado ── -->
    <header class="g-topbar">
      <div class="g-topbar-left">
        <a href="/" class="g-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Volver al mapa
        </a>
        <h1 class="g-title">SIMEVA · Control Interno — Cronogramas</h1>
      </div>
      <button class="g-print" @click="imprimir" title="Imprimir / Exportar PDF">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Imprimir
      </button>
    </header>

    <div class="g-layout">

      <!-- ── Sidebar: lista de circuitos ── -->
      <aside class="g-sidebar">
        <div class="g-sidebar-head">
          <p class="g-sidebar-label">Circuitos viales</p>
          <span class="g-sidebar-count">{{ circuitos.length }}</span>
        </div>
        <div class="g-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="g-search-icon"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="busqueda" class="g-search" placeholder="Buscar circuito…" />
        </div>
        <div class="g-list">
          <button
            v-for="c in filtrados"
            :key="c.id"
            class="g-item"
            :class="{ 'is-active': c.id === selectedId }"
            @click="selectedId = c.id"
          >
            <span class="g-item-name">{{ c.circuito }}</span>
            <span class="g-item-meta">{{ c.municipio }} · {{ c.plazo_meses }} meses · {{ c.longitud_km }} km</span>
          </button>
          <p v-if="!filtrados.length" class="g-no-results">Sin resultados</p>
        </div>
      </aside>

      <!-- ── Contenido: Gantt ── -->
      <main class="g-main">
        <div v-if="circuito" class="gantt-wrap">

          <!-- Título del cronograma -->
          <div class="gantt-header">
            <div class="gantt-titulo">CRONOGRAMA DE ACTIVIDADES — {{ circuito.circuito.toUpperCase() }}</div>
            <div class="gantt-meta">
              <span>Subregión: <strong>{{ circuito.subregion }}</strong></span>
              <span>Longitud: <strong>{{ circuito.longitud_km }} km</strong></span>
              <span>Contratista: <strong>{{ circuito.contratista }}</strong></span>
              <span>Inicio: <strong>{{ circuito.fecha_inicio }}</strong></span>
              <span>Plazo: <strong>{{ circuito.plazo_meses }} meses</strong></span>
            </div>
          </div>

          <!-- Tabla Gantt -->
          <div class="gantt-scroll">
            <table class="g-table">
              <thead>
                <tr>
                  <th class="th-nro">N°</th>
                  <th class="th-act">ACTIVIDAD</th>
                  <th class="th-dur">DUR.<br>(meses)</th>
                  <th class="th-pct">%</th>
                  <th
                    v-for="m in meses"
                    :key="m.idx"
                    class="th-mes"
                  >
                    {{ m.mes }}<br>{{ m.anio }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(act, i) in circuito.actividades"
                  :key="act.id"
                  :class="i % 2 === 0 ? 'tr-even' : 'tr-odd'"
                >
                  <td class="td-nro">{{ i + 1 }}</td>
                  <td class="td-act">{{ act.nombre }}</td>
                  <td class="td-dur">{{ act.duracion_meses }}</td>
                  <td class="td-pct">{{ act.avance_pct }}%</td>
                  <td
                    v-for="m in meses"
                    :key="m.idx"
                    :class="['td-cell', `cell--${estadoCelda(m.idx, act)}`]"
                  />
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Leyenda -->
          <div class="gantt-legend">
            <span class="leg-item"><span class="leg-dot leg-done" />Ejecutado</span>
            <span class="leg-item"><span class="leg-dot leg-planned" />Programado</span>
            <span class="leg-item"><span class="leg-dot leg-empty" />Sin intervención</span>
          </div>

        </div>
        <div v-else class="g-empty">Selecciona un circuito</div>
      </main>

    </div>
  </div>
</template>

<style scoped>
/* ── Root ── */
.g-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Prompt', sans-serif;
  background: #f0f7f3;
  color: #1f2937;
}

/* ── Topbar ── */
.g-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 56px;
  background: linear-gradient(135deg, #083d2c 0%, #0b5640 60%, #1a7a56 100%);
  flex-shrink: 0;
  gap: 16px;
}
.g-topbar-left {
  display: flex;
  align-items: center;
  gap: 20px;
  min-width: 0;
}
.g-back {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(255,255,255,.75);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: color .14s;
}
.g-back svg { width: 14px; height: 14px; }
.g-back:hover { color: #fff; }
.g-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  letter-spacing: .03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.g-print {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1.5px solid rgba(255,255,255,.45);
  background: rgba(255,255,255,.12);
  color: #fff;
  font-family: 'Prompt', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background .14s, border-color .14s;
  flex-shrink: 0;
}
.g-print svg { width: 14px; height: 14px; }
.g-print:hover { background: rgba(255,255,255,.22); border-color: #fff; }

/* ── Layout ── */
.g-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── Sidebar ── */
.g-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-right: 1px solid #d1e9d8;
  overflow: hidden;
}
.g-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 8px;
  flex-shrink: 0;
}
.g-sidebar-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.g-sidebar-count {
  font-size: 11px;
  font-weight: 700;
  color: #0b5640;
  background: #e0f2ea;
  padding: 1px 7px;
  border-radius: 99px;
}
.g-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 12px 10px;
  padding: 7px 10px;
  background: #f3f4f6;
  border-radius: 8px;
  flex-shrink: 0;
}
.g-search-icon { width: 13px; height: 13px; color: #9ca3af; flex-shrink: 0; }
.g-search {
  flex: 1;
  border: none;
  background: transparent;
  font-family: 'Prompt', sans-serif;
  font-size: 12.5px;
  color: #1f2937;
  outline: none;
}
.g-search::placeholder { color: #9ca3af; }
.g-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}
.g-list::-webkit-scrollbar { width: 4px; }
.g-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
.g-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding: 9px 10px;
  border: 1.5px solid transparent;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background .13s, border-color .13s;
}
.g-item:hover { background: #f0f7f3; border-color: #c8e6d4; }
.g-item.is-active { background: #e0f2ea; border-color: #2d8653; }
.g-item-name {
  font-size: 12.5px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.3;
}
.g-item.is-active .g-item-name { color: #0b5640; }
.g-item-meta {
  font-size: 10.5px;
  color: #9ca3af;
  font-weight: 500;
}
.g-no-results {
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  padding: 24px 0;
  font-style: italic;
}

/* ── Main ── */
.g-main {
  flex: 1;
  overflow: auto;
  padding: 24px;
}
.g-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 14px;
  color: #9ca3af;
  font-style: italic;
}

/* ── Gantt wrapper ── */
.gantt-wrap {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 4px 24px rgba(11,86,64,.10), 0 1px 4px rgba(0,0,0,.06);
  overflow: hidden;
  min-width: fit-content;
}

/* ── Gantt header ── */
.gantt-header {
  background: linear-gradient(135deg, #083d2c 0%, #0b5640 100%);
  padding: 16px 24px 14px;
}
.gantt-titulo {
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  letter-spacing: .04em;
  text-align: center;
  margin-bottom: 8px;
}
.gantt-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 18px;
  font-size: 11px;
  color: rgba(255,255,255,.75);
}
.gantt-meta strong { color: #fff; font-weight: 700; }

/* ── Scroll container ── */
.gantt-scroll {
  overflow-x: auto;
}
.gantt-scroll::-webkit-scrollbar { height: 6px; }
.gantt-scroll::-webkit-scrollbar-thumb { background: #c8e6d4; border-radius: 99px; }

/* ── Tabla ── */
.g-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 12.5px;
  font-family: 'Prompt', sans-serif;
}
.g-table thead tr {
  background: #0b5640;
}
.g-table th {
  padding: 8px 6px;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  letter-spacing: .04em;
  text-transform: uppercase;
  text-align: center;
  border-right: 1px solid rgba(255,255,255,.15);
  white-space: nowrap;
}
.th-act { text-align: left; padding-left: 14px; min-width: 240px; }
.th-nro { width: 36px; }
.th-dur { width: 64px; }
.th-pct { width: 46px; }
.th-mes { width: 52px; min-width: 52px; line-height: 1.3; }

.g-table td {
  padding: 8px 6px;
  text-align: center;
  border-right: 1px solid #f0f4f2;
  border-bottom: 1px solid #f0f4f2;
}
.td-act {
  text-align: left;
  padding-left: 14px;
  font-weight: 600;
  color: #1f2937;
  white-space: nowrap;
}
.td-nro { color: #9ca3af; font-size: 11px; font-weight: 600; }
.td-dur { font-weight: 700; color: #0b5640; }
.td-pct { font-weight: 700; color: #374151; }

.tr-even { background: #fff; }
.tr-odd  { background: #f8fbf9; }
.tr-even:hover,
.tr-odd:hover { background: #f0f7f3; }

/* ── Celdas del cronograma ── */
.td-cell { padding: 0; height: 36px; }
.cell--empty   { background: transparent; }
.cell--planned { background: #0b5640; }
.cell--done    { background: #2d8653; position: relative; }
.cell--done::after {
  content: '';
  position: absolute;
  inset: 3px;
  background: rgba(255,255,255,.18);
  border-radius: 2px;
}

/* ── Leyenda ── */
.gantt-legend {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 12px 24px;
  border-top: 1px solid #f0f4f2;
  background: #fafafa;
}
.leg-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  color: #6b7280;
  font-weight: 500;
}
.leg-dot {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
}
.leg-done    { background: #2d8653; }
.leg-planned { background: #0b5640; }
.leg-empty   { background: #f3f4f6; border: 1px solid #e5e7eb; }

/* ── Print ── */
@media print {
  .g-topbar, .g-sidebar { display: none; }
  .g-main { padding: 0; }
  .gantt-wrap { box-shadow: none; border-radius: 0; }
  .gantt-scroll { overflow: visible; }
}
</style>
