<script setup>
import { ref } from 'vue'
import { Layers, Mountain } from 'lucide-vue-next'
import { BASEMAPS } from '../../composables/useMapInit.js'
import { useMapOrchestrator } from '../../composables/useMapOrchestrator.js'
import { useMapStore } from '../../stores/useMapStore.js'
import ViaDetailModal from './ViaDetailModal.vue'
import MapSearch from '../molecules/MapSearch.vue'

const store = useMapStore()
const mapContainer = ref(null)

const {
  activeBasemap, switcherOpen, terrainActive, switchBasemap, toggleTerrain,
  loading, loadError, fromCache, hoverLabel, loadSimeva,
  selectedVia,
  selectedSubregion, selectedMunicipio,
  visibleCallouts,
  noResults,
  openVia,
} = useMapOrchestrator(mapContainer, () => store.activeFilters)
</script>

<template>
  <div class="map-wrapper">
    <!-- Fondo menta cuando no hay mapa base -->
    <div class="map-container" :class="{ 'bg-mint': activeBasemap === 'ninguno' }" ref="mapContainer" />

    <!-- Modal detalle de tramo -->
    <ViaDetailModal
      v-if="selectedVia"
      :via="selectedVia"
      @close="selectedVia = null"
    />

    <!-- Error overlay -->
    <Transition name="loader-fade">
      <div v-if="loadError" class="map-error">
        <div class="error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p class="error-title">No se pudieron cargar los datos</p>
        <p class="error-msg">Verifica tu conexión e intenta de nuevo.</p>
        <button class="error-retry" @click="loadSimeva">Reintentar</button>
      </div>
    </Transition>

    <!-- Loading overlay -->
    <Transition name="loader-fade">
      <div v-if="loading" class="map-loader">
        <div class="loader-ring">
          <svg viewBox="0 0 50 50" class="loader-svg">
            <circle class="loader-track" cx="25" cy="25" r="20" />
            <circle class="loader-arc"   cx="25" cy="25" r="20" />
          </svg>
        </div>
        <span class="loader-text">Cargando datos…</span>
      </div>
    </Transition>

    <!-- ── Callout overlay: líneas + labels por circuito (solo con filtro activo) ── -->
    <svg v-if="visibleCallouts.length" class="callout-svg" aria-hidden="true">
      <g v-for="c in visibleCallouts" :key="c.name + '-line'">
        <line
          :x1="c.lineEndX" :y1="c.lineEndY"
          :x2="c.screenX"  :y2="c.screenY"
          class="co-line"
        />
        <circle :cx="c.screenX" :cy="c.screenY" r="5" class="co-dot" />
        <circle :cx="c.screenX" :cy="c.screenY" r="3" class="co-dot-inner" />
      </g>
    </svg>

    <template v-if="visibleCallouts.length">
      <div
        v-for="c in visibleCallouts"
        :key="c.name + '-label'"
        class="callout-label"
        :style="{ left: c.labelX + 'px', top: c.labelY + 'px' }"
      >
        <div class="co-name">{{ c.name }}</div>
        <div class="co-km">
          <span class="co-km-val">{{ c.km != null ? c.km.toLocaleString('es-CO') : '—' }}</span>
          <span class="co-km-unit"> Km</span>
        </div>
      </div>
    </template>

    <!-- Letreros verticales (izquierda): subregión + municipio juntos -->
    <div v-if="selectedSubregion || selectedMunicipio" class="subreg-group">
      <Transition name="subreg">
        <span v-if="selectedSubregion" class="subreg-text" :key="'sub-' + selectedSubregion">
          {{ selectedSubregion }}
        </span>
      </Transition>
      <Transition name="subreg">
        <span v-if="selectedMunicipio" class="subreg-text subreg-text--sm" :key="'mun-' + selectedMunicipio">
          {{ selectedMunicipio.charAt(0).toUpperCase() + selectedMunicipio.slice(1).toLowerCase() }}
        </span>
      </Transition>
    </div>

    <!-- Logo A Toda Máquina -->
    <div class="atm-logo">
      <img src="/A toda maquina.png" alt="A Toda Máquina" />
    </div>

    <!-- Tooltip hover municipio -->
    <Transition name="tooltip">
      <div
        v-if="hoverLabel.visible"
        class="mpio-tooltip"
        :style="{ left: hoverLabel.x + 'px', top: hoverLabel.y + 'px' }"
      >{{ hoverLabel.name }}</div>
    </Transition>

    <!-- Banner de datos desde caché (offline) -->
    <Transition name="loader-fade">
      <div v-if="fromCache" class="cache-banner">
        Sin conexión — mostrando datos guardados
      </div>
    </Transition>

    <!-- Buscador flotante de vías -->
    <MapSearch @open-via="openVia" />

    <!-- Toast: sin resultados -->
    <Transition name="loader-fade">
      <div v-if="noResults" class="no-results-toast">
        <svg viewBox="0 0 20 20" fill="currentColor" class="nr-icon">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
        </svg>
        No se encontraron vías con ese criterio
      </div>
    </Transition>

    <!-- Botón relieve 3D -->
    <button
      class="terrain-toggle"
      :class="{ 'is-active': terrainActive }"
      @click="toggleTerrain"
      title="Relieve 3D"
    >
      <Mountain :size="16" />
    </button>

    <!-- Selector de mapa base -->
    <div class="basemap-switcher">

      <!-- Panel colapsable (arriba del toggle) -->
      <Transition name="panel">
        <div v-if="switcherOpen" class="switcher-panel">
          <button
            v-for="bm in BASEMAPS"
            :key="bm.id"
            class="basemap-btn"
            :class="{ 'is-active': activeBasemap === bm.id }"
            @click="switchBasemap(bm)"
          >
            <span
              class="bm-swatch"
              :class="{ 'bm-swatch--none': bm.id === 'ninguno' }"
              :style="bm.color ? { background: bm.color } : {}"
            />
            <span class="bm-label">{{ bm.label }}</span>
          </button>
        </div>
      </Transition>

      <!-- Toggle (solo icono) — siempre abajo -->
      <button
        class="switcher-toggle"
        @click="switcherOpen = !switcherOpen"
        :class="{ 'is-open': switcherOpen }"
        title="Mapa base"
      >
        <Layers :size="16" />
      </button>

    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  transition: background-color 0.4s ease;
}

.map-container.bg-mint {
  background-color: #e8f4ed;
}

/* ── Letrero de progreso de pavimentación ── */
/* ── Banner caché offline ── */
.cache-banner {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  background: rgba(146, 64, 14, 0.92);
  color: #fef3c7;
  font-family: 'Prompt', sans-serif;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 14px;
  border-radius: 20px;
  white-space: nowrap;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

/* ── No-results toast ── */
.no-results-toast {
  position: absolute;
  top: 56px;
  right: 56px;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #fde68a;
  border-left: 4px solid #f59e0b;
  border-radius: 10px;
  padding: 9px 14px;
  font-family: 'Prompt', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: #92400e;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  backdrop-filter: blur(8px);
  pointer-events: none;
}
.nr-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #f59e0b;
}

/* ── Terrain toggle ── */
.terrain-toggle {
  position: absolute;
  bottom: 80px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  color: #6b7280;
  outline: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
}

.terrain-toggle:hover {
  background: #f3f4f6;
  border-color: #cbd5e1;
  color: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
}

.terrain-toggle.is-active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

/* ── Basemap switcher ── */
.basemap-switcher {
  position: absolute;
  bottom: 36px;
  right: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.switcher-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  padding: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  color: #6b7280;
  outline: none;
  transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
}

.switcher-toggle:hover {
  background: #f3f4f6;
  border-color: #cbd5e1;
  color: #374151;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
}

.switcher-toggle.is-open {
  border-color: #16a34a;
  background: #f0fdf4;
  color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
}

.switcher-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.14),
    0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 6px;
  min-width: 148px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transform-origin: bottom right;
}

.basemap-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border: 1.5px solid transparent;
  border-radius: 7px;
  background: transparent;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  width: 100%;
  text-align: left;
  outline: none;
}

.basemap-btn:hover { background: #f3f4f6; }

.basemap-btn.is-active {
  background: #f0fdf4;
  border-color: #16a34a;
}

.bm-swatch {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.bm-swatch--none {
  background:
    repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%)
    0 0 / 8px 8px;
}

.bm-label {
  font-size: 13px;
  font-family: 'Prompt', sans-serif;
  color: #374151;
}

.basemap-btn.is-active .bm-label {
  color: #166534;
  font-weight: 500;
}

/* ── Animación: abre hacia arriba con spring ── */
.panel-enter-active {
  transition:
    opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.panel-leave-active {
  transition:
    opacity 0.18s cubic-bezier(0.4, 0, 1, 1),
    transform 0.18s cubic-bezier(0.4, 0, 1, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.88);
}

/* ── Controles MapLibre ── */
:deep(.maplibregl-ctrl-group) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

:deep(.maplibregl-ctrl-group button) {
  background: #ffffff;
  border: none;
  border-radius: 0;
  padding: 0;
  transition: background 0.15s;
  outline: none;
}

:deep(.maplibregl-ctrl-group button:hover) {
  background: #f3f4f6;
}

:deep(.maplibregl-ctrl-attrib) {
  font-size: 10px;
  font-family: 'Prompt', sans-serif;
}

:deep(.maplibregl-ctrl-scale) {
  border-color: #0b5640;
  color: #0b5640;
  font-family: 'Prompt', sans-serif;
  font-size: 10px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 3px;
  padding: 1px 4px;
}

/* ── Popup SIMEVA ── */
:deep(.simeva-popup .maplibregl-popup-content) {
  border-radius: 10px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 6px 24px rgba(0,0,0,0.18);
  font-family: 'Prompt', sans-serif;
  min-width: 200px;
}
:deep(.sp-header) {
  background: #0b5640;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding: 9px 14px;
  line-height: 1.3;
}
:deep(.sp-table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}
:deep(.sp-key) {
  color: #6b7280;
  padding: 5px 10px 5px 14px;
  white-space: nowrap;
  vertical-align: top;
  font-weight: 500;
}
:deep(.sp-val) {
  color: #111827;
  padding: 5px 14px 5px 6px;
  font-weight: 600;
}
:deep(.sp-table tr:nth-child(even)) {
  background: #f9fafb;
}

/* ── Callout overlay ── */
.callout-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 15;
  overflow: visible;
}
.co-line {
  stroke: #0b5640;
  stroke-width: 1.5;
  stroke-dasharray: 5 4;
  opacity: 0.75;
}
.co-dot {
  fill: #ffffff;
  stroke: #0b5640;
  stroke-width: 2;
}
.co-dot-inner { fill: #0b5640; }

.callout-label {
  position: absolute;
  z-index: 16;
  pointer-events: none;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 120px;
  max-width: 175px;
}
.co-name {
  font-family: 'Prompt', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #1a3c2d;
  line-height: 1.25;
}
.co-km {
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  background: #0b5640;
  border-radius: 6px;
  padding: 2px 10px 2px 8px;
}
.co-km-val {
  font-family: 'Prompt', sans-serif;
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
}
.co-km-unit {
  font-family: 'Prompt', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
}

/* ── Tooltip hover municipio ── */
.mpio-tooltip {
  position: absolute;
  z-index: 30;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 10px));
  background: #0b5640;
  color: #fff;
  font-family: 'Prompt', sans-serif;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}
.mpio-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 5px solid transparent;
  border-top-color: #0b5640;
}
.tooltip-enter-active, .tooltip-leave-active {
  transition: opacity .12s ease, transform .12s ease;
}
.tooltip-enter-from, .tooltip-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 6px));
}

/* ── Letreros verticales ── */
.subreg-group {
  position: absolute;
  top: 24px;
  left: 18px;
  z-index: 20;
  pointer-events: none;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 6px;
}

.subreg-text {
  display: inline-block;
  writing-mode: vertical-lr;
  text-orientation: mixed;
  transform: rotate(180deg);
  font-family: 'Prompt', sans-serif;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #0b5640;
  text-shadow: 0 2px 8px rgba(255,255,255,0.7);
  line-height: 1;
  padding: 4px 0;
}

.subreg-text--sm {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: .08em;
  color: #1a5c3a;
  text-shadow: 0 2px 6px rgba(255,255,255,0.65);
}

/* Animación: sube desde abajo */
@keyframes subregIn {
  from { opacity: 0; transform: rotate(180deg) translateY(-30px); }
  to   { opacity: 1; transform: rotate(180deg) translateY(0);      }
}
@keyframes subregOut {
  from { opacity: 1; transform: rotate(180deg) translateY(0);      }
  to   { opacity: 0; transform: rotate(180deg) translateY(-20px);  }
}

.subreg-enter-active .subreg-text {
  animation: subregIn .42s cubic-bezier(.34,1.10,.64,1) both;
}
.subreg-leave-active .subreg-text {
  animation: subregOut .22s ease-in both;
}

/* ── Logo A Toda Máquina ── */
.atm-logo {
  position: absolute;
  bottom: 28px;
  left: 12px;
  z-index: 20;
  pointer-events: none;
}
.atm-logo img {
  height: 112px;
  width: auto;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(0,0,0,0.22));
}
/* ── Error overlay ────────────────────────────────────────────────────────── */
.map-error {
  position: absolute;
  inset: 0;
  z-index: 51;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(234, 244, 237, 0.92);
  backdrop-filter: blur(6px);
}
.error-icon {
  width: 48px;
  height: 48px;
  color: #b91c1c;
  opacity: 0.85;
}
.error-icon svg { width: 100%; height: 100%; }
.error-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a5c3a;
  margin: 0;
}
.error-msg {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}
.error-retry {
  margin-top: 6px;
  padding: 8px 22px;
  border-radius: 8px;
  border: none;
  background: #1a5c3a;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s ease, transform .15s ease;
}
.error-retry:hover  { background: #2d8653; transform: translateY(-1px); }
.error-retry:active { transform: translateY(0); }

/* ── Loading overlay ──────────────────────────────────────────────────────── */
.map-loader {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: rgba(234, 244, 237, 0.82);
  backdrop-filter: blur(6px);
}

.loader-ring {
  width: 56px;
  height: 56px;
  filter: drop-shadow(0 4px 10px rgba(26, 92, 58, 0.3));
}

.loader-svg {
  width: 100%;
  height: 100%;
  animation: spin 1.4s linear infinite;
}

.loader-track {
  fill: none;
  stroke: #c8e6d4;
  stroke-width: 4;
}

.loader-arc {
  fill: none;
  stroke: #1a5c3a;
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 80 45;
  animation: dash 1.4s ease-in-out infinite;
}

.loader-text {
  font-size: 13px;
  font-weight: 600;
  color: #1a5c3a;
  letter-spacing: 0.3px;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes dash {
  0%   { stroke-dashoffset: 0; }
  50%  { stroke-dashoffset: -50; }
  100% { stroke-dashoffset: -125; }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.5; }
}

.loader-fade-enter-active { transition: opacity .3s ease; }
.loader-fade-leave-active { transition: opacity .5s ease; }
.loader-fade-enter-from,
.loader-fade-leave-to     { opacity: 0; }
</style>
