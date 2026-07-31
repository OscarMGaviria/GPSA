<template>
  <transition name="fade-slide">
    <div v-if="stats" class="project-stats-card">
      <h3 class="stats-title">{{ projectName }}</h3>
      
      <div class="stats-content">
        <div class="stat-row">
          <span class="stat-label">Total de predios:</span>
          <span class="stat-value highlight">{{ totalText }}</span>
        </div>

        <div v-if="stats.total !== 'En ejecución' && stats.total !== 'Pendiente por definir'" class="stat-group">
          <h4 class="group-title">Permisos de intervención</h4>
          <div class="stat-row">
            <span class="status-dot green"></span>
            <span class="stat-label">Con permiso:</span>
            <span class="stat-value">{{ stats.green }} predio(s)</span>
          </div>
          <div v-if="stats.red > 0" class="stat-row">
            <span class="status-dot red"></span>
            <span class="stat-label">Sin permiso:</span>
            <span class="stat-value">{{ stats.red }} predio(s)</span>
          </div>
          <div v-if="stats.yellow > 0" class="stat-row">
            <span class="status-dot yellow"></span>
            <span class="stat-label">En otro estado / pendiente:</span>
            <span class="stat-value">{{ stats.yellow }} predio(s)</span>
          </div>
        </div>

        <div v-if="stats.total === 'En ejecución'" class="stat-row">
          <span class="stat-label">Permiso de intervención:</span>
          <span class="stat-value">No aplica (proyecto en ejecución)</span>
        </div>

        <div v-if="stats.total === 'Pendiente por definir'" class="stat-row">
          <span class="stat-label">Permiso de intervención:</span>
          <span class="stat-value">Estado no se sabe / pendiente</span>
        </div>

        <div v-if="stats.obs && stats.obs !== '-'" class="obs-row">
          <span class="obs-label">Observaciones:</span>
          <p class="obs-text">{{ stats.obs }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { projectStats } from '../../data/projectStats.js'

const props = defineProps({
  projectName: {
    type: String,
    default: ''
  }
})

const stats = computed(() => {
  if (!props.projectName || props.projectName === 'Todos los proyectos') return null
  return projectStats[props.projectName] || null
})

const totalText = computed(() => {
  if (!stats.value) return ''
  if (stats.value.total === 'En ejecución') return 'No hay predios afectados (en ejecución)'
  if (stats.value.total === 'Pendiente por definir') return 'Pendiente por definir'
  return `${stats.value.total} predio(s) afectados`
})
</script>

<style scoped>
.project-stats-card {
  position: absolute;
  bottom: 30px;
  right: 80px;
  width: 340px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px) saturate(200%);
  -webkit-backdrop-filter: blur(16px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08), 0 2px 10px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 16px;
  pointer-events: auto;
  color: #1e293b;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
}

.project-stats-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.12), 0 4px 15px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.stats-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  padding-bottom: 10px;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.9rem;
}

.stat-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.02);
  padding: 10px;
  border-radius: 8px;
}

.group-title {
  margin: 0 0 4px 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-weight: 600;
  color: #334155;
  min-width: 80px;
}

.stat-value {
  color: #475569;
}

.stat-value.highlight {
  font-weight: 700;
  color: #0f172a;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.green { background-color: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.4); }
.status-dot.red { background-color: #ef4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.4); }
.status-dot.yellow { background-color: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.4); }

.obs-row {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

.obs-label {
  font-weight: 600;
  color: #334155;
  display: block;
  margin-bottom: 4px;
}

.obs-text {
  margin: 0;
  color: #475569;
  font-style: italic;
  line-height: 1.4;
}

/* Animations */
.fade-slide-enter-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}
</style>
