import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'

function cronogramasApiPlugin() {
  const filePath = path.resolve('./src/data/cronogramas.json')
  return {
    name: 'cronogramas-api',
    configureServer(server) {
      server.middlewares.use('/api/cronogramas', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'GET') {
          res.end(fs.readFileSync(filePath, 'utf8'))
        } else if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body)
              fs.writeFileSync(filePath, JSON.stringify(parsed, null, 2))
              res.end(JSON.stringify({ ok: true }))
            } catch (e) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: e.message }))
            }
          })
        } else {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), cronogramasApiPlugin()],
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
