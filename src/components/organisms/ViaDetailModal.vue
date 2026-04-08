<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import maplibregl from 'maplibre-gl'

const props = defineProps({ via: { type: Object, required: true } })
const emit  = defineEmits(['close'])

// ── Datos ────────────────────────────────────────────────────────────────────
const desc   = computed(() => props.via.description || {})
const photos = computed(() => props.via.photos || { antes: [], durante: [], despues: [] })
const name   = computed(() => props.via.name || 'Tramo sin nombre')

const get = (...keys) => {
  for (const k of keys) if (desc.value[k]) return desc.value[k]
  return ''
}

const avancePct = computed(() => {
  const raw = get('Avance', 'avance') || '0'
  return Math.min(100, Math.max(0, parseFloat(String(raw).replace('%', '').replace(',', '.')) || 0))
})

const barColor = computed(() => {
  if (avancePct.value === 0)  return '#9ca3af'
  if (avancePct.value >= 100) return '#16a34a'
  return '#0b5640'
})

const statusLabel = computed(() => {
  if (avancePct.value === 0)  return 'Sin iniciar'
  if (avancePct.value >= 100) return 'Finalizado'
  return 'En obra'
})

const statusClass = computed(() => {
  if (avancePct.value === 0)  return 'pill--pending'
  if (avancePct.value >= 100) return 'pill--done'
  return 'pill--active'
})

// Orden de la tabla
const TABLE_FIELDS = [
  'Subregión','Municipio','Circuito',
  'Nombre de la vía','Código de la vía',
  'Longitud circuito','Longitud tramo',
  'Avance','Contratista','Fecha de inicio','Plazo',
]
const tableRows = computed(() => {
  const used = new Set()
  const rows = []
  for (const k of TABLE_FIELDS) {
    if (desc.value[k]) { rows.push([k, desc.value[k]]); used.add(k) }
  }
  for (const [k, v] of Object.entries(desc.value)) {
    if (!used.has(k)) rows.push([k, v])
  }
  return rows
})

// ── Galería ───────────────────────────────────────────────────────────────────
const PHASES = [
  { key: 'antes',   label: 'Antes' },
  { key: 'durante', label: 'Durante' },
  { key: 'despues', label: 'Después' },
]
const availablePhases = computed(() => PHASES.filter(p => photos.value[p.key]?.length > 0))
const activePhase = ref('')
const activeIdx   = ref(0)

const activePhotos = computed(() => photos.value[activePhase.value] || [])
const prev = () => { activeIdx.value = (activeIdx.value - 1 + activePhotos.value.length) % activePhotos.value.length }
const next = () => { activeIdx.value = (activeIdx.value + 1) % activePhotos.value.length }
const setPhase = (key) => { activePhase.value = key; activeIdx.value = 0 }

const hasPhotos = computed(() => availablePhases.value.length > 0)

// ── Route animation ───────────────────────────────────────────────────────────
const showRoute   = ref(false)
const routeMapEl  = ref(null)
const routePlaying = ref(false)
let _routeMap  = null
let _animTimer = null

function cleanupRoute() {
  if (_animTimer) { clearInterval(_animTimer); _animTimer = null }
  if (_routeMap)  { _routeMap.remove(); _routeMap = null }
  routePlaying.value = false
}

async function toggleRoute() {
  if (showRoute.value) { showRoute.value = false; cleanupRoute(); return }
  showRoute.value = true
  await nextTick()
  startRouteMap()
}

function startRouteMap() {
  const geometry = props.via.geometry
  if (!geometry || !routeMapEl.value) return

  // Normalizar siempre a array de segmentos (MultiLineString)
  const segments = geometry.type === 'LineString'
    ? [geometry.coordinates]
    : geometry.type === 'MultiLineString'
    ? geometry.coordinates
    : []
  if (!segments.length || !segments[0].length) return

  const firstPt   = segments[0][0]
  const totalPts  = segments.reduce((s, seg) => s + seg.length, 0)

  _routeMap = new maplibregl.Map({
    container: routeMapEl.value,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap © CARTO',
        },
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
    },
    center: firstPt,
    zoom: 13,
    pitch: 30,
    attributionControl: false,
  })

  _routeMap.on('load', () => {
    // La geometría animada sigue la misma estructura (MultiLineString)
    // para no unir segmentos discontinuos con líneas falsas
    const animCoords = [[firstPt]]
    const geojson = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'MultiLineString', coordinates: animCoords } }],
    }

    _routeMap.addSource('trace', { type: 'geojson', data: geojson })
    _routeMap.addLayer({
      id: 'trace-casing',
      type: 'line', source: 'trace',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.6 },
    })
    _routeMap.addLayer({
      id: 'trace',
      type: 'line', source: 'trace',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffaa00', 'line-width': 5, 'line-opacity': 0.95 },
    })

    _routeMap.jumpTo({ center: firstPt, zoom: 14 })
    routePlaying.value = true

    // ~40 segundos de animación progresiva punto a punto
    const INTERVAL = 80
    const BATCH    = Math.max(1, Math.ceil(totalPts / 500))

    let segIdx = 0
    let ptIdx  = 1   // primer punto ya está en animCoords[0]

    _animTimer = setInterval(() => {
      let added  = 0
      let lastPt = null

      while (added < BATCH && segIdx < segments.length) {
        const seg = segments[segIdx]
        if (ptIdx < seg.length) {
          animCoords[segIdx].push(seg[ptIdx])
          lastPt = seg[ptIdx]
          ptIdx++
          added++
        } else {
          // Pasar al siguiente segmento, sin unirlo al anterior
          segIdx++
          ptIdx = 0
          if (segIdx < segments.length) {
            animCoords[segIdx] = [segments[segIdx][0]]
            lastPt = segments[segIdx][0]
            ptIdx  = 1
            added++
          }
        }
      }

      _routeMap.getSource('trace').setData(geojson)
      if (lastPt) {
        const px     = _routeMap.project(lastPt)
        const canvas = _routeMap.getCanvas()
        const padX   = canvas.width  * 0.3
        const padY   = canvas.height * 0.3
        const nearEdge = px.x < padX || px.x > canvas.width  - padX
                      || px.y < padY || px.y > canvas.height - padY
        if (nearEdge) _routeMap.easeTo({ center: lastPt, duration: 600 })
      }

      if (segIdx >= segments.length) {
        clearInterval(_animTimer)
        _animTimer = null
        routePlaying.value = false
      }
    }, INTERVAL)
  })
}

function replayRoute() {
  cleanupRoute()
  startRouteMap()
}

// ── Keyboard / scroll lock ────────────────────────────────────────────────────
const onKey = (e) => {
  if (e.key === 'Escape')     emit('close')
  if (e.key === 'ArrowLeft')  prev()
  if (e.key === 'ArrowRight') next()
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
  const first = availablePhases.value[0]
  if (first) activePhase.value = first.key
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
  cleanupRoute()
})
</script>

<template>
  <Teleport to="body">
    <div class="backdrop" @click.self="emit('close')">
      <div class="modal" role="dialog" aria-modal="true">

        <!-- ── HEADER ── -->
        <header class="mhead">
          <div class="mhead-left">
            <p class="mhead-inst">Gobernación de Antioquia · Secretaría de Infraestructura Física</p>
            <h2 class="mhead-name">{{ name }}</h2>
          </div>
          <button class="btn-x" @click="emit('close')" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <!-- ── TWO COLUMNS ── -->
        <div class="mcols">

          <!-- LEFT: datos -->
          <div class="col-left">

            <!-- Avance -->
            <div class="block">
              <div class="block-header">
                <span class="block-label">Avance de obra</span>
                <span class="status-pill" :class="statusClass">{{ statusLabel }}</span>
              </div>
              <div class="avance-pct-row">
                <span class="avance-pct">{{ avancePct }}<span class="avance-sym">%</span></span>
              </div>
              <div class="bar-wrap">
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: avancePct + '%', background: barColor }" />
                </div>
                <div class="bar-ticks">
                  <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>
              </div>
            </div>

            <div class="divider" />

            <!-- Información del tramo -->
            <div class="block block--table">
              <p class="block-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Información del tramo
              </p>
              <table class="info-tbl">
                <tbody>
                  <tr v-for="[k, v] in tableRows" :key="k">
                    <td class="td-key">{{ k }}</td>
                    <td class="td-val" :class="{ 'td-val--bold': k === 'Contratista' }">{{ v }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          <!-- RIGHT: fotos / ruta -->
          <div class="col-right">
            <div class="block block--full">

              <!-- Tab bar: Fotos / Recorrido -->
              <div class="right-tabs">
                <button class="right-tab" :class="{ 'is-active': !showRoute }" @click="showRoute && toggleRoute()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  Fotos
                </button>
                <button class="right-tab" :class="{ 'is-active': showRoute }" @click="!showRoute && toggleRoute()" :disabled="!via.geometry">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6l9-3 9 3M3 18l9 3 9-3"/></svg>
                  Recorrido
                </button>
              </div>

              <!-- Route mini-map -->
              <template v-if="showRoute">
                <div class="route-wrap">
                  <div ref="routeMapEl" class="route-map" />
                  <div class="route-status">
                    <span v-if="routePlaying" class="route-playing">
                      <span class="route-dot" />
                      Animando recorrido…
                    </span>
                    <span v-else class="route-done">Recorrido completo</span>
                    <button class="btn-replay" @click="replayRoute" title="Repetir animación">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5"/></svg>
                    </button>
                  </div>
                </div>
              </template>

              <!-- Photos -->
              <template v-else>
              <p class="block-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                Registro fotográfico
              </p>

              <!-- Phase tabs -->
              <div v-if="hasPhotos" class="phase-tabs">
                <button
                  v-for="ph in availablePhases" :key="ph.key"
                  class="phase-tab"
                  :class="{ 'is-active': activePhase === ph.key }"
                  @click="setPhase(ph.key)"
                >
                  {{ ph.label }}
                  <span class="phase-count">{{ photos[ph.key].length }}</span>
                </button>
              </div>

              <!-- Photo viewer -->
              <template v-if="hasPhotos && activePhotos.length">
                <div class="photo-stage">
                  <img
                    :src="activePhotos[activeIdx]"
                    :alt="`${activePhase} ${activeIdx + 1}`"
                    class="photo-img"
                  />
                  <button v-if="activePhotos.length > 1" class="pnav pnav--l" @click="prev" aria-label="Anterior">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button v-if="activePhotos.length > 1" class="pnav pnav--r" @click="next" aria-label="Siguiente">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                  <span class="photo-ctr">{{ activeIdx + 1 }} / {{ activePhotos.length }}</span>
                </div>

                <!-- Thumbnails -->
                <div v-if="activePhotos.length > 1" class="thumbs">
                  <button
                    v-for="(src, i) in activePhotos" :key="i"
                    class="thumb"
                    :class="{ 'is-active': i === activeIdx }"
                    @click="activeIdx = i"
                  >
                    <img :src="src" :alt="`miniatura ${i + 1}`" />
                  </button>
                </div>
              </template>

              <!-- Empty state -->
              <div v-else class="no-photos">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <p>Sin registro fotográfico</p>
              </div>
              </template>
            </div>
          </div>

        </div>

        <!-- ── FOOTER ── -->
        <footer class="mfoot">
          <span class="mfoot-brand">Sistema de Seguimiento — Red Vial Departamental</span>
          <button class="btn-cerrar" @click="emit('close')">Cerrar</button>
        </footer>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop ── */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(5, 20, 12, 0.6);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: bfade .2s ease;
}
@keyframes bfade { from { opacity: 0 } to { opacity: 1 } }

/* ── Modal shell ── */
.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 960px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 40px 80px rgba(0,0,0,.28),
    0 8px 24px rgba(0,0,0,.16);
  animation: mup .26s cubic-bezier(.34,1.10,.64,1);
  overflow: hidden;
}
@keyframes mup {
  from { opacity: 0; transform: translateY(22px) scale(.97) }
  to   { opacity: 1; transform: none }
}

/* ── Header ── */
.mhead {
  background: linear-gradient(135deg, #083d2c 0%, #0b5640 50%, #1a7a56 100%);
  padding: 20px 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.mhead::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 90% -10%, rgba(255,255,255,0.07) 0%, transparent 55%);
  pointer-events: none;
}
.mhead-left { flex: 1; min-width: 0; }
.mhead-inst {
  margin: 0 0 5px;
  font-family: 'Prompt', sans-serif;
  font-size: 10px;
  font-weight: 500;
  color: rgba(255,255,255,.5);
  letter-spacing: .06em;
  text-transform: uppercase;
}
.mhead-name {
  margin: 0;
  font-family: 'Prompt', sans-serif;
  font-size: 19px;
  font-weight: 800;
  color: #fff;
  line-height: 1.25;
  letter-spacing: -.01em;
}
.btn-x {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(255,255,255,.55);
  border-radius: 8px;
  background: rgba(255,255,255,.15);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: background .15s, border-color .15s;
}
.btn-x svg { width: 18px; height: 18px; stroke-width: 2.5; }
.btn-x:hover { background: rgba(255,255,255,.28); border-color: #fff; }

/* ── Two columns ── */
.mcols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ── Left column ── */
.col-left {
  border-right: 1px solid #f0f0f0;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
}
.col-left::-webkit-scrollbar       { width: 4px; }
.col-left::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }

/* ── Right column ── */
.col-right {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e5e7eb transparent;
  background: #fafafa;
}
.col-right::-webkit-scrollbar       { width: 4px; }
.col-right::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }

/* ── Block ── */
.block {
  padding: 18px 20px;
}
.block--table { padding-top: 0; }
.block--full  { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.block-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 12px;
  font-family: 'Prompt', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: #9ca3af;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.block-label svg { width: 13px; height: 13px; flex-shrink: 0; }

.divider { height: 1px; background: #f3f4f6; margin: 0 20px; }

/* ── Status pill ── */
.status-pill {
  font-family: 'Prompt', sans-serif;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .05em;
  text-transform: uppercase;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}
.pill--active  { background: #d1fae5; color: #065f46; }
.pill--done    { background: #bbf7d0; color: #14532d; }
.pill--pending { background: #f3f4f6; color: #9ca3af; }

/* ── Avance ── */
.avance-pct-row {
  margin-bottom: 10px;
}
.avance-pct {
  font-family: 'Prompt', sans-serif;
  font-size: 38px;
  font-weight: 900;
  color: #0b5640;
  line-height: 1;
}
.avance-sym {
  font-size: 20px;
  font-weight: 700;
  margin-left: 2px;
}
.bar-wrap { width: 100%; }
.bar-track {
  width: 100%;
  height: 9px;
  background: #f3f4f6;
  border-radius: 99px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 99px;
  min-width: 3px;
  transition: width .7s cubic-bezier(.4,0,.2,1);
}
.bar-ticks {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-family: 'Prompt', sans-serif;
  font-size: 9.5px;
  color: #d1d5db;
  font-weight: 500;
}

/* ── Info table ── */
.info-tbl {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Prompt', sans-serif;
}
.info-tbl tr { border-bottom: 1px solid #f9fafb; }
.info-tbl tr:last-child { border-bottom: none; }
.td-key {
  padding: 7.5px 14px 7.5px 0;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
  white-space: nowrap;
  vertical-align: top;
  width: 46%;
}
.td-val {
  padding: 7.5px 0;
  font-size: 12.5px;
  color: #1f2937;
  font-weight: 600;
  word-break: break-word;
}
.td-val--bold { color: #0b5640; font-weight: 800; font-size: 13px; }

/* ── Phase tabs ── */
.phase-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}
.phase-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 13px;
  border-radius: 7px;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  font-family: 'Prompt', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all .14s;
}
.phase-tab:hover { border-color: #0b5640; color: #0b5640; }
.phase-tab.is-active { background: #0b5640; color: #fff; border-color: #0b5640; }
.phase-count {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 99px;
  background: rgba(255,255,255,.25);
}
.phase-tab:not(.is-active) .phase-count { background: #f3f4f6; color: #9ca3af; }

/* ── Photo viewer ── */
.photo-stage {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: #111;
  aspect-ratio: 4 / 3;
  flex-shrink: 0;
}
.photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity .2s;
}
.pnav {
  position: absolute;
  top: 50%; transform: translateY(-50%);
  width: 32px; height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,.45);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background .14s;
}
.pnav:hover { background: rgba(0,0,0,.68); }
.pnav svg   { width: 14px; height: 14px; }
.pnav--l    { left: 9px; }
.pnav--r    { right: 9px; }
.photo-ctr {
  position: absolute;
  bottom: 8px; right: 10px;
  background: rgba(0,0,0,.5);
  color: #fff;
  font-family: 'Prompt', sans-serif;
  font-size: 10.5px; font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

/* ── Thumbnails ── */
.thumbs {
  display: flex;
  gap: 7px;
  margin-top: 9px;
  overflow-x: auto;
  padding-bottom: 2px;
  flex-shrink: 0;
}
.thumbs::-webkit-scrollbar       { height: 3px; }
.thumbs::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
.thumb {
  width: 66px; height: 48px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  padding: 0;
  opacity: .55;
  transition: border-color .14s, opacity .14s;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb.is-active { border-color: #0b5640; opacity: 1; }
.thumb:hover:not(.is-active) { opacity: .82; border-color: #9ca3af; }

/* ── Empty state ── */
.no-photos {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #d1d5db;
  padding: 40px 20px;
}
.no-photos svg { width: 40px; height: 40px; }
.no-photos p {
  margin: 0;
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  color: #c4c9d2;
}

/* ── Right tabs (Fotos / Recorrido) ── */
.right-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 14px;
  flex-shrink: 0;
}
.right-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  font-family: 'Prompt', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all .14s;
}
.right-tab svg { width: 13px; height: 13px; flex-shrink: 0; }
.right-tab:hover:not(:disabled) { border-color: #0b5640; color: #0b5640; }
.right-tab.is-active { background: #0b5640; color: #fff; border-color: #0b5640; }
.right-tab:disabled  { opacity: .4; cursor: not-allowed; }

/* ── Route mini-map ── */
.route-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.route-map {
  flex: 1;
  border-radius: 10px;
  overflow: hidden;
  min-height: 260px;
  border: 1px solid #e5e7eb;
}
.route-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
  flex-shrink: 0;
}
.route-playing {
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: 'Prompt', sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  color: #0b5640;
}
.route-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #0b5640;
  animation: routePulse 1s ease-in-out infinite;
}
@keyframes routePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: .4; transform: scale(.7); }
}
.route-done {
  font-family: 'Prompt', sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  color: #9ca3af;
}
.btn-replay {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  color: #6b7280;
  transition: background .13s, color .13s, border-color .13s;
  flex-shrink: 0;
}
.btn-replay svg { width: 14px; height: 14px; }
.btn-replay:hover { background: #f0fdf4; color: #0b5640; border-color: #0b5640; }

/* ── Footer ── */
.mfoot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #f9fafb;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.mfoot-brand {
  font-family: 'Prompt', sans-serif;
  font-size: 10.5px;
  color: #b0b7c3;
}
.btn-cerrar {
  padding: 7px 22px;
  border-radius: 8px;
  border: none;
  background: #0b5640;
  color: #fff;
  font-family: 'Prompt', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background .14s, transform .1s;
}
.btn-cerrar:hover  { background: #2d8653; transform: translateY(-1px); }
.btn-cerrar:active { transform: none; }
</style>
