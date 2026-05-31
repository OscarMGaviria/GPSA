import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'

const routes = [
  { path: '/', component: App },
]

// Siempre disponible (protegida por login Microsoft en la propia vista)
routes.push({ path: '/admin-geojson', component: () => import('../views/AdminGeoJsonView.vue') })

// Solo disponible cuando VITE_INTERNAL=true (excluido del bundle de producción)
if (import.meta.env.VITE_INTERNAL === 'true') {
  routes.push({ path: '/gantt',        component: () => import('../views/GanttView.vue') })
  routes.push({ path: '/admin',        component: () => import('../views/AdminView.vue') })
  routes.push({ path: '/reporte',      component: () => import('../views/ReporteView.vue') })
  routes.push({ path: '/compromisos',  component: () => import('../views/CompromisosView.vue') })
}

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
