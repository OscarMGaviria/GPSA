<script setup>
import { computed, ref } from 'vue'
import cronogramas from '../../data/cronogramas.json'

const props = defineProps({
  circuito: { type: String, default: '' },
})

const norm = s =>
  (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const data = computed(() => {
  const q = norm(props.circuito)
  return cronogramas.circuitos.find(c => norm(c.circuito) === q) ?? null
})

// ── Ticks de meses ────────────────────────────────────────────────────────────
const meses = computed(() => {
  if (!data.value) return []
  const { fecha_inicio, plazo_meses } = data.value
  const [d, m, y] = fecha_inicio.split('/')
  const inicio = new Date(+y, +m - 1, 1)
  return Array.from({ length: plazo_meses }, (_, i) => {
    const date  = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1)
    const label = date.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')
    return {
      pct:         (i / plazo_meses) * 100,
      label:       label.charAt(0).toUpperCase() + label.slice(1),
      anio:        date.getFullYear(),
      isYearStart: date.getMonth() === 0,
    }
  })
})

// ── Helper: sumar N meses exactos (calendario real, ISO) ──────────────────────
function addMonths(date, months) {
  const result = new Date(date)
  const day    = result.getDate()
  result.setMonth(result.getMonth() + months)
  // Si el día se desbordó (ej: 31 mar + 1 mes → 1 may), ajustar al último del mes destino
  if (result.getDate() !== day) result.setDate(0)
  return result
}

// ── Posición del día de hoy (%) — fechas calendario reales ────────────────────
const todayPct = computed(() => {
  if (!data.value) return null
  const { fecha_inicio, plazo_meses } = data.value
  const [d, m, y] = fecha_inicio.split('/')
  const inicio = new Date(+y, +m - 1, +d)
  const fin    = addMonths(inicio, plazo_meses)
  const hoy    = new Date()
  const totalMs = fin - inicio
  if (totalMs <= 0) return null
  const elapsedMs = hoy - inicio
  const pct = (elapsedMs / totalMs) * 100
  return pct > 0.5 && pct < 99.5 ? Math.min(99.5, pct) : null
})

// ── Helpers de posición de barras (fechas calendario reales) ──────────────────
const contractStart = computed(() => {
  if (!data.value) return new Date()
  const [d, m, y] = data.value.fecha_inicio.split('/')
  return new Date(+y, +m - 1, +d)
})
const contractEnd = computed(() => addMonths(contractStart.value, data.value?.plazo_meses ?? 1))
const contractSpanMs = computed(() => contractEnd.value - contractStart.value)

function barLeft(act) {
  const actStart = addMonths(contractStart.value, act.inicio_mes - 1)
  return ((actStart - contractStart.value) / contractSpanMs.value) * 100
}
function barWidth(act) {
  const actStart = addMonths(contractStart.value, act.inicio_mes - 1)
  const actEnd   = addMonths(actStart, act.duracion_meses)
  return ((actEnd - actStart) / contractSpanMs.value) * 100
}

// ── Tooltip hover ────────────────────────────────────────────────────────────
const hoveredId = ref(null)
</script>

<template>
  <!-- Sin datos -->
  <div v-if="!data" class="gc-empty">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    <p>Sin datos de cronograma<br>para este circuito</p>
  </div>

  <!-- Gantt -->
  <div v-else class="gc-root">

    <!-- Info pill del contrato -->
    <div class="gc-info-row">
      <span class="gc-pill">{{ data.plazo_meses }} meses</span>
      <span class="gc-pill">{{ data.longitud_km }} km</span>
      <span class="gc-pill gc-pill--green">{{ data.fecha_inicio }}</span>
    </div>

    <!-- Contenedor principal (relativo para la línea de Hoy) -->
    <div class="gc-main">

      <!-- Línea de Hoy — spanning toda la altura del área de timeline -->
      <div
        v-if="todayPct !== null"
        class="gc-today-line"
        :style="{ left: 'calc(150px + (100% - 150px) * ' + todayPct + ' / 100)' }"
      >
        <span class="gc-today-chip">Hoy</span>
      </div>

      <!-- ── Cabecera de meses ── -->
      <div class="gc-header">
        <div class="gc-label-col" />
        <div class="gc-scale">
          <div
            v-for="m in meses"
            :key="m.pct"
            class="gc-tick"
            :class="{ 'gc-tick--year': m.isYearStart }"
            :style="{ left: m.pct + '%' }"
          >
            <span class="gc-tick-label">{{ m.label }}</span>
            <span v-if="m.isYearStart" class="gc-tick-year">{{ m.anio }}</span>
          </div>
        </div>
      </div>

      <!-- ── Filas de actividades ── -->
      <div class="gc-rows">
        <div
          v-for="(act, i) in data.actividades"
          :key="act.id"
          class="gc-row"
          :class="{ 'gc-row--alt': i % 2 === 1, 'gc-row--hover': hoveredId === act.id }"
          :style="{ animationDelay: (80 + i * 75) + 'ms' }"
          @mouseenter="hoveredId = act.id"
          @mouseleave="hoveredId = null"
        >
          <!-- Label -->
          <div class="gc-label-col gc-label">
            <span class="gc-act-num">{{ act.id }}</span>
            <span class="gc-act-name" :title="act.nombre">{{ act.nombre }}</span>
          </div>

          <!-- Track + barra -->
          <div class="gc-scale gc-track">
            <!-- Grid lines (cada mes) -->
            <div
              v-for="m in meses"
              :key="'g' + m.pct"
              class="gc-grid-line"
              :class="{ 'gc-grid-line--year': m.isYearStart }"
              :style="{ left: m.pct + '%' }"
            />

            <!-- Barra -->
            <div
              class="gc-bar"
              :style="{ left: barLeft(act) + '%', width: barWidth(act) + '%' }"
            >
              <!-- Fondo (programado) -->
              <div class="gc-bar-bg" />
              <!-- Fill ejecutado -->
              <div
                v-if="act.avance_pct > 0"
                class="gc-bar-done"
                :style="{ width: act.avance_pct + '%', animationDelay: (80 + i * 75 + 200) + 'ms' }"
              >
                <span v-if="act.avance_pct >= 15" class="gc-bar-pct">{{ act.avance_pct }}%</span>
              </div>
            </div>

            <!-- Badge % (cuando no cabe dentro de la barra) -->
            <div
              v-if="act.avance_pct > 0 && act.avance_pct < 15"
              class="gc-pct-badge"
              :style="{ left: 'calc(' + barLeft(act) + '% + ' + (barWidth(act)) + '% + 4px)' }"
            >{{ act.avance_pct }}%</div>

          </div>
        </div>
      </div>
    </div>

    <!-- Leyenda -->
    <div class="gc-legend">
      <span class="gc-leg">
        <span class="gc-leg-swatch gc-leg-done" />
        Ejecutado
      </span>
      <span class="gc-leg">
        <span class="gc-leg-swatch gc-leg-planned" />
        Programado
      </span>
      <span v-if="todayPct !== null" class="gc-leg">
        <span class="gc-leg-today" />
        Hoy
      </span>
    </div>

  </div>
</template>

<style scoped>
/* ── Vacío ── */
.gc-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #c4c9d2;
  padding: 32px 16px;
}
.gc-empty svg { width: 36px; height: 36px; }
.gc-empty p { margin: 0; font-family: 'Prompt', sans-serif; font-size: 12.5px; text-align: center; line-height: 1.5; }

/* ── Animaciones de entrada ── */
@keyframes gcRootIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
}
@keyframes gcRowIn {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: none; }
}
@keyframes gcBarGrow {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0% 0 0); }
}

/* ── Root ── */
.gc-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 0;
  flex: 1;
  min-height: 0;
  animation: gcRootIn 0.5s cubic-bezier(0.23, 1, 0.32, 1) both;
}

/* ── Info row ── */
.gc-info-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.gc-pill {
  font-family: 'Prompt', sans-serif;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 99px;
  background: #f0f4f2;
  color: #4b5563;
  letter-spacing: .03em;
}
.gc-pill--green {
  background: #dcf5e8;
  color: #0b5640;
}

/* ── Contenedor principal (relativo para la línea de Hoy) ── */
.gc-main {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ── Línea de Hoy ── */
.gc-today-line {
  position: absolute;
  top: 0;
  bottom: 28px; /* deja espacio a la leyenda */
  width: 2px;
  background: linear-gradient(180deg, #f59e0b 0%, rgba(245,158,11,.35) 100%);
  border-radius: 2px;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 0 6px rgba(245,158,11,.55);
}
.gc-today-chip {
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  background: #f59e0b;
  color: #fff;
  font-family: 'Prompt', sans-serif;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  white-space: nowrap;
  letter-spacing: .04em;
  box-shadow: 0 2px 6px rgba(245,158,11,.45);
}

/* ── Columna label + escala (layout compartido) ── */
.gc-label-col { width: 150px; flex-shrink: 0; }
.gc-scale     { flex: 1; position: relative; min-width: 0; }

/* ── Cabecera meses ── */
.gc-header {
  display: flex;
  align-items: flex-end;
  height: 36px;
  padding-bottom: 4px;
  border-bottom: 1.5px solid #e5ede9;
  flex-shrink: 0;
}
.gc-tick {
  position: absolute;
  bottom: 6px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  pointer-events: none;
}
.gc-tick::before {
  content: '';
  position: absolute;
  bottom: -6px;
  width: 1px;
  height: 4px;
  background: #c8e6d4;
}
.gc-tick--year::before { background: #0b5640; height: 6px; }
.gc-tick-label {
  font-family: 'Prompt', sans-serif;
  font-size: 9px;
  font-weight: 600;
  color: #9ca3af;
  letter-spacing: .02em;
  white-space: nowrap;
}
.gc-tick--year .gc-tick-label { color: #0b5640; font-weight: 800; }
.gc-tick-year {
  font-family: 'Prompt', sans-serif;
  font-size: 8px;
  font-weight: 700;
  color: #0b5640;
  opacity: .6;
}

/* ── Filas ── */
.gc-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}
.gc-row {
  display: flex;
  align-items: center;
  height: 40px;
  flex-shrink: 0;
  border-radius: 6px;
  transition: background .12s;
  animation: gcRowIn 0.5s cubic-bezier(0.23, 1, 0.32, 1) both;
}
.gc-row--alt   { background: rgba(11,86,64,.03); }
.gc-row--hover { background: rgba(11,86,64,.07) !important; }

/* ── Label de actividad ── */
.gc-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 10px;
}
.gc-act-num {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e0f2ea;
  color: #0b5640;
  font-family: 'Prompt', sans-serif;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.gc-act-name {
  font-family: 'Prompt', sans-serif;
  font-size: 10.5px;
  font-weight: 600;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
  max-width: 118px;
}

/* ── Track (área de la barra) ── */
.gc-track { height: 100%; }

/* Grid lines */
.gc-grid-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(11,86,64,.06);
  pointer-events: none;
}
.gc-grid-line--year { background: rgba(11,86,64,.16); }

/* ── Barra ── */
.gc-bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 14px;
  border-radius: 99px;
  overflow: hidden;
}
.gc-bar-bg {
  position: absolute;
  inset: 0;
  background: rgba(11,86,64,.13);
  border: 1.5px solid rgba(11,86,64,.22);
  border-radius: 99px;
}
.gc-bar-done {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  border-radius: 99px;
  background: linear-gradient(90deg, #0b5640 0%, #2d8653 55%, #3fad72 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.25);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 5px;
  min-width: 14px;
  animation: gcBarGrow 1s cubic-bezier(0.23, 1, 0.32, 1) both;
}
.gc-bar-pct {
  font-family: 'Prompt', sans-serif;
  font-size: 8px;
  font-weight: 800;
  color: #fff;
  letter-spacing: .02em;
  white-space: nowrap;
}

/* Badge % externo (cuando la barra es pequeña) */
.gc-pct-badge {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-family: 'Prompt', sans-serif;
  font-size: 8.5px;
  font-weight: 700;
  color: #2d8653;
  white-space: nowrap;
}

/* ── Leyenda ── */
.gc-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 0 2px;
  border-top: 1px solid #f0f4f2;
  flex-shrink: 0;
}
.gc-leg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'Prompt', sans-serif;
  font-size: 9.5px;
  color: #9ca3af;
  font-weight: 500;
}
.gc-leg-swatch {
  width: 20px;
  height: 8px;
  border-radius: 99px;
  flex-shrink: 0;
}
.gc-leg-done    { background: linear-gradient(90deg, #0b5640, #3fad72); }
.gc-leg-planned { background: rgba(11,86,64,.15); border: 1.5px solid rgba(11,86,64,.25); }
.gc-leg-today {
  width: 2px;
  height: 14px;
  background: #f59e0b;
  border-radius: 2px;
  flex-shrink: 0;
  box-shadow: 0 0 4px rgba(245,158,11,.5);
}
</style>
