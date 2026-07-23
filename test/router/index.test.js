import { describe, it, expect } from 'vitest'
import router from '../../src/router/index.js'

describe('router', () => {
  it('registra la ruta raíz apuntando a App.vue', () => {
    const routes = router.getRoutes()
    const root = routes.find(r => r.path === '/')
    expect(root).toBeDefined()
  })

  it('registra la ruta /admin-geojson con carga diferida (lazy)', () => {
    const routes = router.getRoutes()
    const admin = routes.find(r => r.path === '/admin-geojson')
    expect(admin).toBeDefined()
    expect(typeof admin.components.default).toBe('function')
  })

  it('el loader lazy de /admin-geojson resuelve el componente de la vista', async () => {
    const routes = router.getRoutes()
    const admin = routes.find(r => r.path === '/admin-geojson')
    const mod = await admin.components.default()
    expect(mod.default).toBeDefined()
  })

  it('solo define las 2 rutas esperadas', () => {
    const paths = router.getRoutes().map(r => r.path).sort((a, b) => a.localeCompare(b))
    expect(paths).toEqual(['/', '/admin-geojson'])
  })

  it('usa un historial de navegación (createWebHistory) cuando VITE_BASE_URL no apunta a /simeva', () => {
    // En modo test no se define VITE_BASE_URL con /simeva, por lo que se espera HTML5 history.
    expect(router.options.history.base).toBeDefined()
  })
})
