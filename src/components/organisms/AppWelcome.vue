<script setup>
import { ref } from 'vue'
import { Map, BarChart3, SlidersHorizontal } from '@lucide/vue'

const emit = defineEmits(['close'])

const show = ref(true)
const logoSrc = import.meta.env.BASE_URL + 'Logo-gob-antioquia-ant.png'

function closeWelcome() {
  show.value = false
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="welcome-fade">
      <div v-if="show" class="welcome-overlay" @click.self="closeWelcome">
        <div class="welcome-card">
          <!-- Decorative top glow -->
          <div class="card-glow"></div>
          
          <div class="welcome-header">
            <img :src="logoSrc" alt="Gobernación de Antioquia" class="welcome-logo-img" />
            <h2 class="welcome-title">¡Bienvenido a SIMEVA!</h2>
            <p class="welcome-subtitle">Visor interactivo</p>
          </div>

          <div class="welcome-content">
            <p class="intro-text">
              Consulta el avance de las obras de mejoramiento vial con estabilización en el departamento de Antioquia.
            </p>

            <div class="guide-steps">
              <div class="step-item">
                <div class="step-icon-container">
                  <Map :size="20" class="step-icon" />
                </div>
                <div class="step-details">
                  <h4 class="step-title">Mapa Interactivo</h4>
                  <p class="step-desc">Arrastra y haz zoom en el mapa para explorar las vías. Toca cualquier línea naranja para conocer los detalles del circuito.</p>
                </div>
              </div>

              <div class="step-item">
                <div class="step-icon-container">
                  <BarChart3 :size="20" class="step-icon" />
                </div>
                <div class="step-details">
                  <h4 class="step-title">Panel de Estadísticas</h4>
                  <p class="step-desc">Desliza la barra inferior hacia arriba para consultar el resumen del proyecto</p>
                </div>
              </div>

              <div class="step-item">
                <div class="step-icon-container">
                  <SlidersHorizontal :size="20" class="step-icon" />
                </div>
                <div class="step-details">
                  <h4 class="step-title">Búsqueda y Filtros</h4>
                  <p class="step-desc">Usa el botón de <strong>"Filtros"</strong> en la parte superior para enfocar el análisis en subregiones, municipios o circuitos específicos.</p>
                </div>
              </div>
            </div>
          </div>

          <div class="welcome-actions">
            <button class="btn-start" @click="closeWelcome">
              <span>Explorar el proyecto</span>
              <div class="btn-shine"></div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.welcome-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 33, 23, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 16px;
}

.welcome-card {
  position: relative;
  width: 100%;
  max-width: 440px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  box-shadow: 
    0 10px 40px -10px rgba(11, 86, 64, 0.25),
    0 1px 3px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: cardEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-glow {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 120px;
  background: radial-gradient(circle, rgba(163, 217, 185, 0.45) 0%, rgba(163, 217, 185, 0) 70%);
  pointer-events: none;
}

.welcome-header {
  text-align: center;
  padding: 28px 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-logo-img {
  height: 64px;
  width: auto;
  display: block;
  object-fit: contain;
  filter: drop-shadow(0 2px 8px rgba(11, 86, 64, 0.15));
  margin-bottom: 14px;
}

.welcome-title {
  font-family: 'Prompt', sans-serif;
  font-size: 22px;
  font-weight: 800;
  color: #0b5640;
  margin: 0;
  letter-spacing: -0.01em;
}

.welcome-subtitle {
  font-family: 'Prompt', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #1a5c3a;
  letter-spacing: 0.05em;
  margin: 6px 0 0;
}

.welcome-content {
  padding: 0 24px;
  flex: 1;
}

.intro-text {
  font-size: 13px;
  line-height: 1.5;
  color: #4b5563;
  text-align: center;
  margin: 0 0 20px;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.step-item {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 12px 14px;
  background: rgba(240, 248, 243, 0.6);
  border: 1px solid rgba(220, 238, 226, 0.8);
  border-radius: 16px;
  transition: transform 0.2s, background-color 0.2s;
}

.step-item:hover {
  transform: translateY(-1px);
  background: rgba(240, 248, 243, 0.9);
}

.step-icon-container {
  width: 36px;
  height: 36px;
  background: #ffffff;
  border: 1px solid rgba(200, 223, 208, 0.4);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.step-icon {
  color: #1a5c3a;
}

.step-details {
  flex: 1;
}

.step-title {
  font-family: 'Prompt', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #0b5640;
  margin: 0 0 2px;
}

.step-desc {
  font-size: 11px;
  line-height: 1.4;
  color: #6b7280;
  margin: 0;
}

.welcome-actions {
  padding: 16px 24px 28px;
}

.btn-start {
  position: relative;
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #1d7249 0%, #0d5f39 100%);
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-family: 'Prompt', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 
    0 4px 14px rgba(29, 114, 73, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-start:active {
  transform: scale(0.98);
}

.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
  animation: shine 3s infinite;
}

/* Animations */
@keyframes cardEntrance {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes shine {
  0% { left: -100%; }
  35% { left: 100%; }
  100% { left: 100%; }
}

/* Vue transitions */
.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition: opacity 0.3s ease;
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;
}

.welcome-fade-enter-active .welcome-card {
  animation: cardEntrance 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.welcome-fade-leave-active .welcome-card {
  transition: transform 0.2s ease, opacity 0.2s ease;
  transform: scale(0.95);
  opacity: 0;
}
</style>
