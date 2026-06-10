import JSZip from 'jszip'
import { CSS } from './useReporte.js'
import hitosData from '../data/hitos.json'

// ── CSS del shell de presentación (copia exacta del app) ──────────────────────
const SHELL_CSS = `
* { margin:0; padding:0; box-sizing:border-box }
html, body {
  background: #060e18;
  height: 100%; width: 100%;
  overflow: hidden;
  font-family: 'Prompt', sans-serif;
}
#ppt-stage {
  position: fixed; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 0;
  background: radial-gradient(ellipse at 50% 40%, #0d1f2e 0%, #060e18 100%);
}
#ppt-row {
  flex: 1; min-height: 0;
  display: flex; align-items: center; justify-content: center;
  gap: 20px; padding: 16px 0 0;
  width: 100%;
}
#slide-host {
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  box-shadow: 0 24px 72px rgba(0,0,0,.85), 0 4px 16px rgba(0,0,0,.5);
  flex-shrink: 0;
}
#slide-inner {
  width: 1280px; height: 720px;
  transform-origin: top left;
  position: relative;
}
.nav-btn {
  width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(145deg, #0f7a4a, #0b5640);
  border: 1.5px solid rgba(63,173,114,.5);
  color: #fff; cursor: pointer; outline: none; flex-shrink: 0;
  transition: all .18s cubic-bezier(.25,1,.5,1);
  box-shadow: 0 4px 16px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.12);
}
.nav-btn svg { width: 48px; height: 48px; fill: #fff; }
.nav-btn:hover:not(:disabled) {
  background: linear-gradient(145deg, #14a060, #0d6b4e);
  transform: scale(1.08) translateY(-1px);
}
.nav-btn:active:not(:disabled) { transform: scale(.94); }
.nav-btn:disabled { opacity: .2; cursor: default; transform: none; box-shadow: none; }
#ppt-footer {
  flex-shrink: 0; height: 46px;
  display: flex; align-items: center; justify-content: center; gap: 18px;
  width: 100%;
}
.rv-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255,255,255,.18); cursor: pointer;
  border: none; padding: 0; transition: all .2s;
}
.rv-dot:hover { background: rgba(255,255,255,.4) }
.rv-dot.active { background: #3fad72; transform: scale(1.3) }
.rv-lbl  { font-size: 11px; color: rgba(255,255,255,.35); min-width: 80px; text-align: center; font-family: 'Prompt', sans-serif; }
.rv-hint { font-size: 10px; color: rgba(255,255,255,.18); letter-spacing: .03em; font-family: 'Prompt', sans-serif; }
`

// ── Navegación: misma lógica del app (pasa por "Ver Ejecución" antes de avanzar) ─
const NAV_JS = `
(function () {
  var W = 1280, H = 720;
  var idx = 0;

  function scale() {
    var host  = document.getElementById('slide-host');
    var inner = document.getElementById('slide-inner');
    var s = Math.min((window.innerWidth - 140) / W, (window.innerHeight - 80) / H);
    host.style.width  = Math.round(W * s) + 'px';
    host.style.height = Math.round(H * s) + 'px';
    inner.style.transform = 'scale(' + s + ')';
  }

  function renderDots() {
    var c = document.getElementById('dots');
    c.innerHTML = '';
    SLIDES.forEach(function (_, i) {
      var d = document.createElement('button');
      d.className = 'rv-dot' + (i === idx ? ' active' : '');
      d.onclick = function () { goTo(i); };
      c.appendChild(d);
    });
  }

  function show(i) {
    idx = Math.max(0, Math.min(SLIDES.length - 1, i));
    document.getElementById('slide-inner').innerHTML = SLIDES[idx];
    document.getElementById('btn-prev').disabled = (idx === 0);
    document.getElementById('btn-next').disabled = (idx === SLIDES.length - 1);
    document.getElementById('lbl').textContent = (idx + 1) + ' / ' + SLIDES.length;
    renderDots();
  }

  function goTo(i) { show(i); }

  function handleNext() {
    var inner = document.getElementById('slide-inner');
    var actsBtn = inner ? inner.querySelector('[id^="btn-acts-"]') : null;
    if (actsBtn && !actsBtn.classList.contains('active')) {
      actsBtn.click();
      return;
    }
    if (idx < SLIDES.length - 1) show(idx + 1);
  }

  function handlePrev() {
    var inner = document.getElementById('slide-inner');
    var actsBtn = inner ? inner.querySelector('[id^="btn-acts-"]') : null;
    var infoBtn = inner ? inner.querySelector('[id^="btn-info-"]') : null;
    if (actsBtn && actsBtn.classList.contains('active')) {
      if (infoBtn) infoBtn.click();
      return;
    }
    if (idx > 0) show(idx - 1);
  }

  document.getElementById('btn-prev').onclick = handlePrev;
  document.getElementById('btn-next').onclick = handleNext;

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')                       handlePrev();
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ')   handleNext();
  });

  window.__pptGoToSubregion = function(subnorm) {
    var i = SLIDES.findIndex(function(html) { return html.indexOf('id="sub_' + subnorm + '"') !== -1; });
    if (i !== -1) show(i);
  };

  window.addEventListener('resize', scale);
  scale();
  show(0);
})();
`

function buildHtml(slidesJson) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Presentación SIMEVA</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Prompt:ital,wght@0,300;0,400;0,600;0,700;0,800;0,900;1,300&display=swap" rel="stylesheet">
<style>
${SHELL_CSS}
${CSS}
</style>
</head>
<body>
<div id="ppt-stage">
  <div id="ppt-row">
    <button class="nav-btn" id="btn-prev" aria-label="Anterior" disabled>
      <svg viewBox="0 0 24 24"><polygon points="15,4 5,12 15,20"/></svg>
    </button>
    <div id="slide-host">
      <div id="slide-inner"></div>
    </div>
    <button class="nav-btn" id="btn-next" aria-label="Siguiente">
      <svg viewBox="0 0 24 24"><polygon points="9,4 19,12 9,20"/></svg>
    </button>
  </div>
  <div id="ppt-footer">
    <div id="dots" style="display:flex;gap:4px"></div>
    <span id="lbl" class="rv-lbl"></span>
    <span class="rv-hint">← → navegar</span>
  </div>
</div>
<script>
const SLIDES = ${slidesJson.replace(/<\/script>/gi, '<\\/script>')};
${NAV_JS}
<\/script>
</body>
</html>`
}

// ── Decodifica y normaliza una ruta de imagen ─────────────────────────────────
// Convierte /images/Sopetr%C3%A1n%20-.../ → /images/Sopetrán -…/
function decodePath(p) {
  try { return decodeURIComponent(p) } catch { return p }
}

// ── Reescribe rutas /images/... → ./fotos/images/... ────────────────────────
// Usa split/join para manejar correctamente rutas con espacios y caracteres especiales
function rewritePaths(html) {
  return html
    .split('/images/').join('./fotos/images/')
    .split('/Escudo%20de%20armas.png').join('./fotos/Escudo%20de%20armas.png')
    .split('/Escudo de armas.png').join('./fotos/Escudo de armas.png')
}

// ── Extrae rutas únicas de imágenes del HTML (antes de reescribir) ───────────
function extractImagePaths(html) {
  const paths = new Set()
  // [^"'>\\]+ permite espacios — necesario para archivos como "WhatsApp Image 2026-05-25 at 12.13.03 PM.jpeg"
  const re = /\/images\/([^"'>\\]+)/g
  let m
  while ((m = re.exec(html)) !== null) {
    // Limpiar trailing whitespace o caracteres que no son parte del path
    const clean = m[1].replace(/[\s>)]+$/, '')
    if (clean) paths.add('/images/' + clean)
  }
  return paths
}

// ── Extrae rutas de fotos de actividades desde hitos.json ───────────────────
function extractActividadPhotoPaths() {
  const paths = new Set()
  for (const registros of Object.values(hitosData)) {
    for (const reg of registros) {
      const acts = [
        ...(reg.ejecutadas    ?? []),
        ...(reg.en_ejecucion  ?? []),
        ...(reg.pendientes    ?? []),
      ]
      for (const act of acts) {
        for (const url of (act.fotos ?? [])) {
          const clean = url.replace('/public/', '/')
          if (clean.startsWith('/images/')) paths.add(clean)
        }
      }
    }
  }
  return paths
}

// ── Descarga una imagen como ArrayBuffer ─────────────────────────────────────
async function fetchImage(path) {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────
export async function exportarPresentacion(slides, onProgress) {
  const zip         = new JSZip()
  const fotosFolder = zip.folder('fotos')

  // 1. Recopilar todas las rutas de imágenes
  const allHtml   = slides.map(s => s.html).join('\n')
  const htmlPaths = extractImagePaths(allHtml)
  const actPaths  = extractActividadPhotoPaths()
  const allPaths  = new Set([...htmlPaths, ...actPaths])

  // 2. Reescribir rutas en las diapositivas (decodificando URL encoding)
  const processedSlides = slides.map(s => ({ html: rewritePaths(s.html) }))

  // 3. Descargar imágenes y agregarlas al ZIP con nombres decodificados
  const pathsArr = Array.from(allPaths)
  let done = 0
  const total = pathsArr.length

  await Promise.allSettled(pathsArr.map(async (rawPath) => {
    const buf = await fetchImage(rawPath)
    if (buf) {
      // Decodificar nombre del archivo en el ZIP para que coincida con el HTML
      const zipPath = decodePath(rawPath.slice(1)) // quita la / inicial
      fotosFolder.file(zipPath, buf)
    }
    done++
    onProgress?.(Math.round((done / total) * 80))
  }))

  onProgress?.(88)

  // 4. Construir HTML
  const slidesJson = JSON.stringify(processedSlides.map(s => s.html))
  zip.file('presentacion.html', buildHtml(slidesJson))

  onProgress?.(94)

  // 5. Generar y descargar ZIP
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  onProgress?.(100)

  const today = new Date().toISOString().slice(0, 10)
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href      = url
  a.download  = `SIMEVA_Presentacion_${today}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
