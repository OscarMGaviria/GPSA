<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { Layers, Mountain } from '@lucide/vue'
import { BASEMAPS } from '../../composables/useMapInit.js'
import { useMapOrchestrator } from '../../composables/useMapOrchestrator.js'
import { useMapStore } from '../../stores/useMapStore.js'
import ViaDetailModal from './ViaDetailModal.vue'

const store = useMapStore()
const mapContainer = ref(null)

const {
  activeBasemap, switcherOpen, terrainActive, switchBasemap, toggleTerrain,
  loading, loadError, fromCache, hoverLabel, viaHoverLabel, loadSimeva,
  selectedVia, selectedMpio,
  selectedSubregion, selectedMunicipio,
  noResults,
  openVia,
  flyToVia,
  flyToCoords,
  mapBearing,
  resetBearing,
  toggleDevMarker,
} = useMapOrchestrator(mapContainer, () => store.activeFilters)

defineExpose({ openVia, flyToVia })

// ── Coordinate Search ────────────────────────────────────────────────────────
const searchOpen  = ref(false)
const searchQuery = ref('')
const searchError = ref('')
const searchInput = ref(null)

function _parseCoords(raw) {
  const s = raw.trim().slice(0, 100)

  // DMS con símbolo de grado: 6°14'39"N 75°34'52"W  (segundos opcionales)
  // Cuantificadores acotados (grados ≤3 díg., min/seg ≤2 díg.) para evitar
  // backtracking super-lineal (SonarQube javascript:S5852) en entradas largas.
  const noSpace = s.replaceAll(/\s+/g, '')
  const dmsLat = /(\d{1,3})°(\d{1,2})['’](\d{1,2}(?:\.\d{1,6})?)?["”]?([NS])/i
  const dmsLng = /(\d{1,3})°(\d{1,2})['’](\d{1,2}(?:\.\d{1,6})?)?["”]?([EW])/i
  const mLat = noSpace.match(dmsLat)
  const mLng = noSpace.match(dmsLng)
  if (mLat && mLng) {
    const toD = (d, mn, sec, h) => {
      const v = +d + +mn / 60 + (+sec || 0) / 3600
      return /[SW]/i.test(h) ? -v : v
    }
    return { lat: toD(mLat[1], mLat[2], mLat[3], mLat[4]), lng: toD(mLng[1], mLng[2], mLng[3], mLng[4]) }
  }

  // DMS sin símbolo pero con N/S/E/W: 6 14 39.1 N 75 34 52 W
  const cleanS = s.replaceAll(/[,\s]+/g, ' ').toUpperCase()
  const dmsLoose = /(\d{1,3}) (\d{1,2}) (\d{1,2}(?:\.\d{1,6})?) ([NS]) (\d{1,3}) (\d{1,2}) (\d{1,2}(?:\.\d{1,6})?) ([EW])/
  const m2 = cleanS.match(dmsLoose)
  if (m2) {
    const toD = (d, mn, sec, h) => {
      const v = +d + +mn / 60 + (+sec || 0) / 3600
      return /[SW]/i.test(h) ? -v : v
    }
    return { lat: toD(m2[1], m2[2], m2[3], m2[4]), lng: toD(m2[5], m2[6], m2[7], m2[8]) }
  }

  // Grados decimales: "6.2442, -75.5812" o "-75.5812 6.2442"
  const parts = s.replaceAll(/[,;]+/g, ' ').split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = Number.parseFloat(parts[0])
    const b = Number.parseFloat(parts[1])
    if (!Number.isNaN(a) && !Number.isNaN(b)) {
      // Heurística: longitud Colombia ~-79 a -66, latitud ~-5 a 15
      if (b < -30 && a > -20 && a < 25) return { lat: a, lng: b }
      if (a < -30 && b > -20 && b < 25) return { lat: b, lng: a }
      return { lat: a, lng: b }
    }
  }

  return null
}

function doSearch() {
  if (!searchQuery.value.trim()) return
  const coords = _parseCoords(searchQuery.value)
  if (!coords) {
    searchError.value = 'Formato no reconocido'
    return
  }
  searchError.value = ''
  flyToCoords(coords.lat, coords.lng)
  searchOpen.value = false
  searchQuery.value = ''
}

function openSearch() {
  searchOpen.value = true
  searchError.value = ''
  nextTick(() => searchInput.value?.focus())
}

function closeSearch() {
  searchOpen.value = false
  searchQuery.value = ''
  searchError.value = ''
}

function _onGlobalKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    searchOpen.value ? closeSearch() : openSearch()
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault()
    toggleDevMarker()
  }
}

onMounted(()  => globalThis.addEventListener('keydown', _onGlobalKey))
onUnmounted(() => globalThis.removeEventListener('keydown', _onGlobalKey))
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

    <!-- Modal municipio -->
    <Transition name="mpio-modal">
      <div v-if="selectedMpio" class="mpio-modal-overlay" @click.self="selectedMpio = null">
        <div class="mpio-modal">
          <button class="mpio-close" @click="selectedMpio = null">✕</button>
          <div class="mpio-header">
            <svg class="mpio-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            <span class="mpio-nombre">{{ selectedMpio.nombre }}</span>
          </div>
          <div class="mpio-body">
            <div class="mpio-row">
              <span class="mpio-lbl">Subregión</span>
              <span class="mpio-val">{{ selectedMpio.subregion }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>

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
      <img :src="'/A toda maquina.png'" alt="A Toda Máquina" />
    </div>

    <!-- Tooltip hover vía -->
    <Transition name="via-tip">
      <div
        v-if="viaHoverLabel.visible"
        class="via-tooltip"
        :style="{ left: viaHoverLabel.x + 'px', top: viaHoverLabel.y + 'px' }"
      >
        <div class="vt-name">{{ viaHoverLabel.name }}</div>
        <div class="vt-meta">
          <span v-if="viaHoverLabel.km != null" class="vt-km">{{ viaHoverLabel.km.toLocaleString('es-CO') }} km</span>
          <span v-if="viaHoverLabel.avance != null" class="vt-avance">{{ viaHoverLabel.avance }}% avance</span>
        </div>
      </div>
    </Transition>

    <!-- Banner de datos desde caché (offline) -->
    <Transition name="loader-fade">
      <div v-if="fromCache" class="cache-banner">
        Sin conexión — mostrando datos guardados
      </div>
    </Transition>

<!-- Toast: sin resultados -->
    <Transition name="loader-fade">
      <div v-if="noResults" class="no-results-toast">
        <svg viewBox="0 0 20 20" fill="currentColor" class="nr-icon">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
        </svg>
        No se encontraron vías con ese criterio
      </div>
    </Transition>

    <!-- Barra de búsqueda de coordenadas (Ctrl+B) -->
    <Transition name="coord-search">
      <div v-if="searchOpen" class="cs-wrap" @keydown.esc.stop="closeSearch">
        <div class="cs-box">
          <div class="cs-row">
            <svg class="cs-pin-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            <input
              ref="searchInput"
              v-model="searchQuery"
              class="cs-input"
              placeholder="6.2442, -75.5812  ·  6°14'39&quot;N 75°34'52&quot;W"
              spellcheck="false"
              autocomplete="off"
              @keydown.enter.prevent="doSearch"
              @keydown.esc.stop="closeSearch"
              @input="searchError = ''"
            />
            <button class="cs-go" @click="doSearch" :disabled="!searchQuery.trim()" title="Ir a coordenadas">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
            <button class="cs-close" @click="closeSearch" title="Cerrar (Esc)">✕</button>
          </div>
          <div v-if="searchError" class="cs-error">
            <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            {{ searchError }}
          </div>
          <div v-else class="cs-hints">
            <span>Decimales: <code>6.2442, -75.5812</code></span>
            <span class="cs-sep">·</span>
            <span>GMS: <code>6°14'39"N 75°34'52"W</code></span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Brújula / Rosa de los vientos (Norte) -->
    <button
      class="compass-toggle"
      @click="resetBearing"
      title="Orientar al Norte"
      :style="{ transform: `rotate(${-mapBearing}deg)` }"
    >
      <svg viewBox="0 0 40 40" class="compass-svg">
        <circle cx="20" cy="20" r="16" fill="rgba(255, 255, 255, 0.6)" stroke="rgba(200, 223, 208, 0.5)" stroke-width="1.5" />
        <path d="M20 7 L24 20 L20 17 Z" fill="#ef4444" />
        <path d="M20 7 L16 20 L20 17 Z" fill="#c2410c" />
        <path d="M20 33 L24 20 L20 23 Z" fill="#9ca3af" />
        <path d="M20 33 L16 20 L20 23 Z" fill="#6b7280" />
        <circle cx="20" cy="20" r="2.5" fill="#ffffff" stroke="#374151" stroke-width="1" />
        <text x="20" y="6.5" font-size="5.5" font-family="'Prompt', sans-serif" font-weight="900" text-anchor="middle" fill="#1e293b" dy="0">N</text>
      </svg>
    </button>

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

    <!-- Mensaje del Secretario -->
    <div class="secre-mensaje">
      <div class="secre-quote-text">
        “La transformación de Antioquia no es un acto de audacia momentánea, es una certeza”.
      </div>
      <div class="secre-quote-author">
        Luis Horacio Gallón Arango
      </div>
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
  background: #fef9ec;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 9px 14px;
  font-family: 'Prompt', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: #92400e;
  box-shadow: 0 4px 16px rgba(0,0,0,0.10);
  backdrop-filter: blur(8px);
  pointer-events: none;
}
.nr-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: #f59e0b;
}

/* ── Compass toggle ── */
.compass-toggle {
  position: absolute;
  bottom: 124px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(200, 223, 208, 0.5);
  border-radius: 50%;
  box-shadow: 
    0 4px 12px rgba(11, 86, 64, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  cursor: pointer;
  outline: none;
  transition: background 0.15s ease-out, border-color 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.1s ease-out;
}
.compass-toggle:active {
  transform: scale(0.92);
}
@media (hover: hover) and (pointer: fine) {
  .compass-toggle:hover {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(45, 134, 83, 0.45);
    box-shadow: 
      0 6px 16px rgba(11, 86, 64, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 1);
  }
}
.compass-svg {
  width: 100%;
  height: 100%;
  display: block;
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
  width: 38px;
  height: 38px;
  padding: 0;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(200, 223, 208, 0.5);
  border-radius: 12px;
  box-shadow: 
    0 4px 12px rgba(11, 86, 64, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  cursor: pointer;
  color: #4b5563;
  outline: none;
  transition: background 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.1s ease-out;
}
.terrain-toggle:active { transform: scale(0.92); }
@media (hover: hover) and (pointer: fine) {
  .terrain-toggle:hover {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(45, 134, 83, 0.45);
    color: #111827;
    box-shadow: 
      0 6px 16px rgba(11, 86, 64, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 1);
  }
}
.terrain-toggle.is-active {
  border-color: rgba(163, 217, 185, 0.8);
  background: rgba(240, 253, 244, 0.9);
  color: #0b5640;
  box-shadow: 
    0 4px 14px rgba(29, 114, 73, 0.16),
    0 0 0 3px rgba(45, 134, 83, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
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
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  padding: 0;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(200, 223, 208, 0.5);
  border-radius: 12px;
  box-shadow: 
    0 4px 12px rgba(11, 86, 64, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  cursor: pointer;
  color: #4b5563;
  outline: none;
  transition: background 0.15s ease-out, border-color 0.15s ease-out, color 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.1s ease-out;
}
.switcher-toggle:active { transform: scale(0.92); }
@media (hover: hover) and (pointer: fine) {
  .switcher-toggle:hover {
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(45, 134, 83, 0.45);
    color: #111827;
    box-shadow: 
      0 6px 16px rgba(11, 86, 64, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 1);
  }
}
.switcher-toggle.is-open {
  border-color: rgba(163, 217, 185, 0.8);
  background: rgba(240, 253, 244, 0.9);
  color: #0b5640;
  box-shadow: 
    0 4px 14px rgba(29, 114, 73, 0.16),
    0 0 0 3px rgba(45, 134, 83, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.switcher-panel {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(200, 223, 208, 0.5);
  border-radius: 16px;
  box-shadow:
    0 10px 30px -10px rgba(11, 86, 64, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  padding: 6px;
  min-width: 154px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transform-origin: bottom right;
}

.basemap-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border: 1.5px solid transparent;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  transition: background 0.12s ease-out, border-color 0.12s ease-out, transform 0.1s ease-out;
  width: 100%;
  text-align: left;
  outline: none;
}
.basemap-btn:active { transform: scale(0.97); }
@media (hover: hover) and (pointer: fine) {
  .basemap-btn:hover { background: rgba(0, 0, 0, 0.03); }
}
.basemap-btn.is-active {
  background: rgba(240, 253, 244, 0.7);
  border-color: rgba(163, 217, 185, 0.8);
}

.bm-swatch {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.bm-swatch--none {
  background:
    repeating-conic-gradient(#cbd5e1 0% 25%, #ffffff 0% 50%)
    0 0 / 8px 8px;
}

.bm-label {
  font-size: 13px;
  font-family: 'Prompt', sans-serif;
  color: #4b5563;
  font-weight: 500;
}

.basemap-btn.is-active .bm-label {
  color: #0b5640;
  font-weight: 700;
}

/* ── Animación: abre hacia arriba con spring ── */
.panel-enter-active {
  transition:
    opacity 0.25s cubic-bezier(0.23, 1, 0.32, 1),
    transform 0.25s cubic-bezier(0.23, 1, 0.32, 1);
}

.panel-leave-active {
  transition:
    opacity 0.15s cubic-bezier(0.4, 0, 1, 1),
    transform 0.15s cubic-bezier(0.4, 0, 1, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
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


/* ── Tooltip hover vía ── */
.via-tooltip {
  position: absolute;
  z-index: 30;
  pointer-events: none;
  transform: translate(-50%, calc(-100% - 12px));
  transform-origin: bottom center;
  background: #0b5640;
  color: #fff;
  font-family: 'Prompt', sans-serif;
  border-radius: 8px;
  padding: 6px 12px 7px;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.via-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #0b5640;
}
.vt-name {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
  max-width: 240px;
  white-space: normal;
}
.vt-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.vt-km {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255,255,255,0.75);
}
.vt-avance {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.15);
  padding: 1px 6px;
  border-radius: 99px;
}
.via-tip-enter-active {
  transition: opacity .15s ease, transform .18s cubic-bezier(0.22, 1, 0.36, 1);
}
.via-tip-leave-active {
  transition: opacity .1s ease, transform .1s ease;
}
.via-tip-enter-from {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 6px)) scale(0.95);
}
.via-tip-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% - 8px));
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
  animation: subregOut .22s ease-out both;
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
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.22));
  animation: floatLogo 6s ease-in-out infinite;
}

/* ── Mensaje del Secretario ── */
.secre-mensaje {
  position: absolute;
  top: 16px;
  right: 62px;
  z-index: 20;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: 'Prompt', sans-serif;
  user-select: none;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}
.secre-quote-text {
  color: #0b5640;
  font-size: 13.5px;
  font-weight: 700;
  line-height: 1.4;
  text-align: left;
}
.secre-quote-author {
  color: #0b5640;
  font-size: 11.5px;
  font-weight: 800;
  align-self: flex-end;
  text-align: right;
  letter-spacing: 0.02em;
}
/* ── Modal municipio ─────────────────────────────────────────────────────── */
.mpio-modal-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 30, 18, 0.45);
  backdrop-filter: blur(3px);
}
.mpio-modal {
  position: relative;
  background: rgba(255,255,255,0.97);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(63,173,114,0.3);
  border-radius: 18px;
  padding: 0;
  min-width: 240px;
  max-width: 320px;
  box-shadow: 0 12px 40px rgba(11,86,64,0.25), 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}
.mpio-close {
  position: absolute;
  top: 10px;
  right: 12px;
  background: rgba(107,114,128,0.1);
  border: none;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  transition: background .15s;
  z-index: 1;
}
.mpio-close:hover { background: rgba(239,68,68,0.25); }
.mpio-header {
  background: linear-gradient(135deg, #0b5640 0%, #0d6b4e 100%);
  padding: 18px 20px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.mpio-icon {
  width: 22px;
  height: 22px;
  color: rgba(255,255,255,0.85);
  flex-shrink: 0;
}
.mpio-nombre {
  font-family: 'Prompt', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
  text-transform: capitalize;
}
.mpio-body {
  padding: 14px 20px 18px;
}
.mpio-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid #f0f4f1;
}
.mpio-lbl {
  font-family: 'Prompt', sans-serif;
  font-size: 11.5px;
  color: #9ca3af;
  font-weight: 500;
}
.mpio-val {
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #0b5640;
  text-transform: capitalize;
}

.mpio-modal-enter-active { transition: opacity .2s ease, transform .25s cubic-bezier(.34,1.10,.64,1); }
.mpio-modal-leave-active { transition: opacity .15s ease, transform .15s ease; }
.mpio-modal-enter-from  { opacity: 0; transform: scale(.92); }
.mpio-modal-leave-to    { opacity: 0; transform: scale(.95); }

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
  transition: background .2s ease-out, transform .1s ease-out;
}
.error-retry:active { transform: scale(0.97); }
@media (hover: hover) and (pointer: fine) {
  .error-retry:hover { background: #2d8653; }
}
@media (prefers-reduced-motion: reduce) {
  .panel-enter-active,
  .panel-leave-active,
  .via-tip-enter-active,
  .via-tip-leave-active,
  .loader-fade-enter-active,
  .loader-fade-leave-active { transition: none; }
  .terrain-toggle:active,
  .switcher-toggle:active,
  .basemap-btn:active,
  .error-retry:active { transform: none; }
  .subreg-enter-active .subreg-text,
  .subreg-leave-active .subreg-text { animation: none; opacity: 1; }
}

/* ── Coordinate Search Bar ─────────────────────────────────────────────────── */
.cs-wrap {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  pointer-events: none;
}

.cs-box {
  pointer-events: all;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(11, 86, 64, 0.18);
  border-radius: 14px;
  box-shadow:
    0 8px 32px rgba(11, 86, 64, 0.18),
    0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 10px 12px 8px;
  min-width: 440px;
  font-family: 'Prompt', sans-serif;
}

.cs-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cs-pin-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #0b5640;
  stroke-width: 2;
}

.cs-input {
  flex: 1;
  border: none;
  outline: none;
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  background: transparent;
  padding: 2px 4px;
  min-width: 0;
}

.cs-input::placeholder {
  color: #9ca3af;
  font-weight: 400;
}

.cs-go {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border: none;
  border-radius: 8px;
  background: #0b5640;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  padding: 0;
}

.cs-go:hover { background: #0d6b4f; }
.cs-go:active { transform: scale(0.93); }
.cs-go:disabled { background: #d1d5db; cursor: default; }

.cs-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.12s, color 0.12s;
  padding: 0;
}

.cs-close:hover { background: #fef2f2; color: #ef4444; }

.cs-hints {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding-left: 24px;
  font-size: 10.5px;
  color: #9ca3af;
}

.cs-sep { color: #d1d5db; }

.cs-hints code {
  font-size: 10px;
  font-family: 'Courier New', monospace;
  background: #f3f4f6;
  border-radius: 4px;
  padding: 1px 5px;
  color: #374151;
}

.cs-error {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  padding-left: 24px;
  font-size: 11px;
  font-weight: 600;
  color: #dc2626;
}

/* Transition */
.coord-search-enter-active {
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.10, 0.64, 1);
}
.coord-search-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.coord-search-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px) scale(0.97);
}
.coord-search-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

@media (max-width: 1024px) {
  .basemap-switcher {
    bottom: 76px;
  }
  .terrain-toggle {
    bottom: 120px;
  }
  .compass-toggle {
    bottom: 164px;
  }
  .atm-logo {
    bottom: 76px;
    left: 12px;
  }
  .atm-logo img {
    height: 60px;
  }
  .secre-mensaje {
    top: 12px;
    max-width: 250px;
    padding: 0;
  }
  .secre-quote-text {
    font-size: 11px;
    line-height: 1.25;
  }
  .secre-quote-author {
    font-size: 9px;
  }
}

@keyframes floatLogo {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0);
  }
}
</style>
