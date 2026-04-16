import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  base: '/',
  build: {
    // Separar vendors estables en chunks propios para aprovechar caché del navegador
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-map':   ['maplibre-gl'],
          'vendor-vue':   ['vue', 'pinia'],
          'vendor-icons': ['lucide-vue-next'],
        },
      },
    },
    // Subir el umbral de advertencia — maplibre-gl es grande por necesidad
    chunkSizeWarningLimit: 800,
  },
})
