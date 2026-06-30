import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import App from '../App.vue'

const routes = [
  { path: '/', component: App },
]

// Siempre disponible (protegida por login Microsoft en la propia vista)
routes.push({ path: '/admin-geojson', component: () => import('../views/AdminGeoJsonView.vue') })


const isGhPages = import.meta.env.VITE_BASE_URL?.includes('/simeva')
export default createRouter({
  history: isGhPages ? createWebHashHistory(import.meta.env.BASE_URL) : createWebHistory(import.meta.env.BASE_URL),
  routes,
})
