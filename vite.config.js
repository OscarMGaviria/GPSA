import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

function compromisosApiPlugin() {
  const filePath = path.resolve('./src/data/compromisos.json')
  return {
    name: 'compromisos-api',
    configureServer(server) {
      server.middlewares.use('/api/compromisos', (req, res) => {
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

function photosApiPlugin() {
  const baseDir  = path.resolve('./public/images/circuitos')
  const TIPOS    = ['antes', 'durante', 'despues']
  const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

  function scanTipo(circuito, tipo) {
    const dir = path.join(baseDir, circuito, tipo)
    if (!fs.existsSync(dir)) return []
    return fs.readdirSync(dir)
      .filter(f => IMG_EXTS.has(path.extname(f).toLowerCase()))
      .sort()
      .map(f => `/images/circuitos/${encodeURIComponent(circuito)}/${tipo}/${encodeURIComponent(f)}`)
  }

  return {
    name: 'photos-api',
    configureServer(server) {
      server.middlewares.use('/api/circuito-photos', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

        const circuito = decodeURIComponent(req.url.split('?')[0].replace(/^\//, ''))
        if (!circuito) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Missing circuito' })) }

        if (req.method === 'GET') {
          const result = {}
          for (const t of TIPOS) result[t] = scanTipo(circuito, t)
          return res.end(JSON.stringify(result))
        }

        res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' }))
      })
    }
  }
}

function actividadFotoPlugin() {
  const saveDir = path.resolve('./public/images/actividades')
  const EXT_MAP = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' }

  return {
    name: 'actividad-foto-api',
    configureServer(server) {
      server.middlewares.use('/api/actividad-foto', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

        // POST → recibe imagen como raw buffer, devuelve { ok, url }
        if (req.method === 'POST') {
          fs.mkdirSync(saveDir, { recursive: true })
          const mime = (req.headers['content-type'] ?? 'image/jpeg').split(';')[0].trim()
          const ext  = EXT_MAP[mime] ?? '.jpg'
          const fname = randomUUID() + ext
          const chunks = []
          req.on('data', c => chunks.push(c))
          req.on('end', () => {
            try {
              fs.writeFileSync(path.join(saveDir, fname), Buffer.concat(chunks))
              res.end(JSON.stringify({ ok: true, url: `/images/actividades/${fname}` }))
            } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })) }
          })
          return
        }

        // DELETE ?filename=uuid.jpg → elimina el archivo
        if (req.method === 'DELETE') {
          const qs   = new URLSearchParams(req.url.split('?')[1] ?? '')
          const fname = qs.get('filename')
          if (!fname || fname.includes('/') || fname.includes('..')) {
            res.statusCode = 400; return res.end(JSON.stringify({ error: 'Invalid filename' }))
          }
          try {
            const fp = path.join(saveDir, fname)
            if (fs.existsSync(fp)) fs.unlinkSync(fp)
            res.end(JSON.stringify({ ok: true }))
          } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })) }
          return
        }

        res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' }))
      })
    }
  }
}

function hitosApiPlugin() {
  const filePath = path.resolve('./src/data/hitos.json')
  return {
    name: 'hitos-api',
    configureServer(server) {
      server.middlewares.use('/api/hitos', (req, res) => {
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

function localizacionApiPlugin() {
  const filePath = path.resolve('./public/data/localizacion.geojson')
  return {
    name: 'localizacion-api',
    configureServer(server) {
      server.middlewares.use('/api/localizacion', (req, res) => {
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
              fs.writeFileSync(filePath, JSON.stringify(parsed))
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

function circuitPhotoUploadPlugin() {
  const baseDir  = path.resolve('./public/images/circuitos')
  const TIPOS    = new Set(['antes', 'durante', 'despues'])
  const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

  function safePath(cir, tipo, filename) {
    if (!cir || cir.includes('/') || cir.includes('..')) return null
    if (!TIPOS.has(tipo)) return null
    if (!filename || filename.includes('/') || filename.includes('..')) return null
    const ext = path.extname(filename).toLowerCase()
    if (!IMG_EXTS.has(ext)) return null
    return path.join(baseDir, cir, tipo, filename)
  }

  return {
    name: 'circuit-photo-upload',
    configureServer(server) {
      server.middlewares.use('/api/circuit-photo-upload', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        res.setHeader('Content-Type', 'application/json')
        if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return }

        const qs       = new URLSearchParams((req.url.split('?')[1]) ?? '')
        const circuito = decodeURIComponent(qs.get('circuito') ?? '')
        const tipo     = qs.get('tipo') ?? ''
        const filename = decodeURIComponent(qs.get('filename') ?? '')

        if (req.method === 'POST') {
          const fp = safePath(circuito, tipo, filename)
          if (!fp) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Invalid params' })) }
          fs.mkdirSync(path.dirname(fp), { recursive: true })
          const chunks = []
          req.on('data', c => chunks.push(c))
          req.on('end', () => {
            try {
              fs.writeFileSync(fp, Buffer.concat(chunks))
              res.end(JSON.stringify({ ok: true, url: `/images/circuitos/${encodeURIComponent(circuito)}/${tipo}/${encodeURIComponent(filename)}` }))
            } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })) }
          })
          return
        }

        if (req.method === 'DELETE') {
          const fp = safePath(circuito, tipo, filename)
          if (!fp) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Invalid params' })) }
          try {
            if (fs.existsSync(fp)) fs.unlinkSync(fp)
            res.end(JSON.stringify({ ok: true }))
          } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })) }
          return
        }

        res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed' }))
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
  plugins: [vue(), cronogramasApiPlugin(), compromisosApiPlugin(), localizacionApiPlugin(), hitosApiPlugin(), actividadFotoPlugin(), photosApiPlugin(), circuitPhotoUploadPlugin(), stubInternalModulesPlugin(isInternal)].filter(Boolean),
  test: {
    environment: 'jsdom',
    globals: true,
  },
  base: process.env.VITE_BASE_URL || env.VITE_BASE_URL || '/',
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
