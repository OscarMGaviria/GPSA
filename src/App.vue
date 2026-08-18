<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import AppHeader  from './components/organisms/AppHeader.vue'
import MapView    from './components/organisms/MapView.vue'

import AppTour    from './components/organisms/AppTour.vue'
import AppWelcome from './components/organisms/AppWelcome.vue'
import { useMapStore } from './stores/useMapStore.js'

const store = useMapStore()
const { activeFilters, filterOptions, mapLoading } = storeToRefs(store)

const showTour    = ref(localStorage.getItem('simeva-tour-done') !== '1')
const showWelcome = ref(localStorage.getItem('simeva-welcome-done') !== '1')

function closeWelcome() {
  showWelcome.value = false
  localStorage.setItem('simeva-welcome-done', '1')
}
const mapViewRef  = ref(null)

const isMobile = ref(false)
const checkMobile = () => {
  isMobile.value = globalThis.innerWidth <= 1024
}
onMounted(() => {
  checkMobile()
  globalThis.addEventListener('resize', checkMobile)
})
onUnmounted(() => {
  globalThis.removeEventListener('resize', checkMobile)
})

// Sincronizar URL al cambiar filtros
watch(activeFilters, (f) => {
  const p = new URLSearchParams()
  if (f.search)    p.set('search',    f.search)
  if (f.puente && f.puente !== 'Todos los puentes') p.set('puente', f.puente)
  if (f.pap && f.pap !== 'Todos los PAP y otros')  p.set('pap', f.pap)
  const qs = p.toString()
  globalThis.history.replaceState(null, '', qs ? `?${qs}` : globalThis.location.pathname)
}, { deep: true })
</script>

<template>
  <div id="app">

    <!-- ── Loading full-screen ── -->
    <Transition name="loader-fade">
      <div v-if="mapLoading" class="app-loader">
        <div class="loader-ring">
          <svg viewBox="0 0 50 50" class="loader-svg">
            <circle class="loader-track" cx="25" cy="25" r="20" />
            <circle class="loader-arc"   cx="25" cy="25" r="20" />
          </svg>
        </div>
        <span class="loader-text">Cargando datos…</span>
      </div>
    </Transition>

    <AppTour v-if="showTour && !isMobile && !showWelcome" @close="showTour = false" />
    <AppWelcome v-if="showWelcome" @close="closeWelcome" />

    <AppHeader
      @filter-change="store.setFilter"
      @start-tour="showTour = true"
      :puente-options="filterOptions.puentes"
      :pap-options="filterOptions.paps"
      :active-filters="activeFilters"
    />
    <div class="content-area">
      <MapView ref="mapViewRef" />
    </div>
  </div>
</template>

<style scoped>
#app {
  width: 100%;
  height: 100vh;
  height: 100dvh;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.content-area {
  display: flex;
  flex-direction: row;
  flex: 1;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .content-area {
    position: relative;
    flex-direction: column;
  }
}

/* ── Loading full-screen ── */
.app-loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(234, 244, 237, 0.92);
  backdrop-filter: blur(6px);
}
.loader-ring {
  width: 64px;
  height: 64px;
  filter: drop-shadow(0 4px 12px rgba(26, 92, 58, 0.35));
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
  font-family: 'Prompt', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #1a5c3a;
  letter-spacing: 0.3px;
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes spin  { to { transform: rotate(360deg); } }
@keyframes dash  { 0% { stroke-dashoffset: 0; } 50% { stroke-dashoffset: -50; } 100% { stroke-dashoffset: -125; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.loader-fade-enter-active { transition: opacity .3s ease; }
.loader-fade-leave-active { transition: opacity .6s ease; }
.loader-fade-enter-from,
.loader-fade-leave-to     { opacity: 0; }
</style>
