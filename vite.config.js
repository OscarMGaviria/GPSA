import { defineConfig, loadEnv } from 'vite'
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

// En producción, los archivos internos (AppShell, router, vistas internas) no existen
// en el repo. Este plugin hace stub de cualquier import relativo cuyo archivo no esté
// en disco, para que Rollup pueda resolverlos sin error. El código que los usa nunca
// se ejecuta porque las condiciones VITE_INTERNAL guardan cada rama.
function stubInternalModulesPlugin(isInternal) {
  if (isInternal) return null
  return {
    name: 'stub-internal-modules',
    resolveId(id, importer) {
      if (!importer || !id.startsWith('.')) return
      const dir = path.dirname(importer.replace(/^\0/, ''))
      const exts = ['', '.vue', '.js', '/index.js', '/index.vue']
      const exists = exts.some(ext => fs.existsSync(path.resolve(dir, id + ext)))
      if (!exists) return '\0stub:' + id
    },
    load(id) {
      if (id.startsWith('\0stub:')) return 'export default {}'
    },
  }
}

export default defineConfig(({ mode }) => {
  const env        = loadEnv(mode, process.cwd(), '')
  const isInternal = env.VITE_INTERNAL === 'true'

  return {
  plugins: [vue(), cronogramasApiPlugin(), stubInternalModulesPlugin(isInternal)].filter(Boolean),
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
  }
})
