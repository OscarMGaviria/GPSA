import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'

async function bootstrap() {
  const isInternal = import.meta.env.VITE_INTERNAL === 'true'

  const { default: RootComponent } = isInternal
    ? await import(/* @vite-ignore */ './AppShell.vue')
    : await import('./App.vue')

  const app = createApp(RootComponent)
  app.use(createPinia())

  if (isInternal) {
    const { default: router } = await import(/* @vite-ignore */ './router/index.js')
    app.use(router)
  }

  app.mount('#app')
}

bootstrap()
