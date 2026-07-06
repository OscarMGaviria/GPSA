import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'

async function bootstrap() {
  const isAdminGeoJson = globalThis.location.pathname.startsWith('/admin-geojson')
  const useRoutes = isAdminGeoJson
  const isMsalRedirect = globalThis.location.hash.includes('code=') || globalThis.location.hash.includes('error=')

  // Si es una redirección de MSAL (regreso de Microsoft tras login/token),
  // procesamos la respuesta de autenticación, montamos la app con el router
  // y navegamos a la página de origen sin recargar la página.
  // Esto mantiene la instancia de MSAL y la sesión en memoria.
  if (isMsalRedirect) {
    const { useAdminAuth } = await import('./composables/useAdminAuth.js')
    const { initAuth, consumeReturnUrl } = useAdminAuth()
    await initAuth()

    const { default: AppShell } = await import(/* @vite-ignore */ './AppShell.vue')
    const { default: router }   = await import(/* @vite-ignore */ './router/index.js')
    const app = createApp(AppShell)
    app.use(createPinia())
    app.use(router)
    app.mount('#app')

    await router.isReady()
    const returnUrl = consumeReturnUrl()
    await router.replace(returnUrl)
    return
  }

  const { default: RootComponent } = useRoutes
    ? await import(/* @vite-ignore */ './AppShell.vue')
    : await import('./App.vue')

  const app = createApp(RootComponent)
  app.use(createPinia())

  if (useRoutes) {
    const { default: router } = await import(/* @vite-ignore */ './router/index.js')
    app.use(router)
  }

  app.mount('#app')
}

bootstrap()
