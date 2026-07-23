import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ViaDetailModal from '../../../src/components/organisms/ViaDetailModal.vue'

const VIA_PROP = {
  name: 'Frontino - Nutibara',
  idCircuito: 'C-001',
  subregion: 'Occidente',
  description: {
    Subregión: 'Occidente',
    Municipio: 'Frontino',
    Circuito: 'Frontino - Nutibara',
    Contrato: 'C1',
    Contratista: 'CONSORCIO A',
    Interventoría: 'INT1',
    'Longitud (km)': 10,
    'Avance físico': '50%',
    'Fecha de inicio': '2024-01-01',
    'Plazo (meses)': 12,
    'Duración transcurrida': '20%',
  },
}

function mockFetch(responseData, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    json: () => Promise.resolve(responseData),
  }))
}

function click(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

let wrapper
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function waitFetch() {
  await nextTick()
  await new Promise(r => setTimeout(r, 20))
  await nextTick()
}

describe('ViaDetailModal — datos e información', () => {
  beforeEach(() => {
    mockFetch({ antes: [], durante: [], despues: [] })
  })

  it('muestra el nombre del tramo y la tabla de información', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    expect(document.querySelector('.mhead-name').textContent).toContain('Frontino - Nutibara')
    const rows = [...document.querySelectorAll('.info-tbl tr')].map(tr => tr.querySelector('.td-key').textContent)
    expect(rows).toContain('Contratista')
    expect(rows).toContain('Longitud (km)')
  })

  it('calcula el porcentaje, color y estado de avance', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    expect(document.querySelector('.status-pill').textContent).toBe('En obra')
    expect(document.querySelector('.status-pill').className).toContain('pill--active')
  })

  it('muestra "Sin registro fotográfico" si no hay fotos', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    expect(document.querySelector('.no-photos')).not.toBeNull()
  })

  it('omite los chips de cabecera y agrega filas extra cuando faltan/sobran campos', async () => {
    const viaIncompleta = {
      name: 'Tramo X',
      idCircuito: 'C-002',
      description: {
        Contrato: 'C2',
        'Campo Extra': 'valor extra',
      },
    }
    wrapper = mount(ViaDetailModal, { props: { via: viaIncompleta }, attachTo: document.body })
    await waitFetch()
    expect(document.querySelector('.mhead-chip')).toBeNull()
    const rows = [...document.querySelectorAll('.info-tbl tr')].map(tr => tr.querySelector('.td-key').textContent)
    expect(rows).toContain('Campo Extra')
  })
})

describe('ViaDetailModal — galería de fotos', () => {
  beforeEach(() => {
    mockFetch({
      antes: ['https://x.com/antes1.jpg'],
      durante: ['https://x.com/durante1.jpg'],
      despues: ['https://x.com/despues1.jpg'],
    })
  })

  it('muestra la imagen activa y el contador', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    expect(document.querySelector('.photo-ctr').textContent).toBe('1 / 3')
  })

  it('avanza a la siguiente foto con el botón de navegación', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    click(document.querySelector('.pnav--r'))
    await nextTick()
    expect(document.querySelector('.photo-ctr').textContent).toBe('2 / 3')
  })

  it('retrocede con el botón anterior (circular)', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    click(document.querySelector('.pnav--l'))
    await nextTick()
    expect(document.querySelector('.photo-ctr').textContent).toBe('3 / 3')
  })

  it('navega con las miniaturas', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    click(document.querySelectorAll('.thumb')[2])
    await nextTick()
    expect(document.querySelector('.photo-ctr').textContent).toBe('3 / 3')
  })

  it('navega con las flechas del teclado', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    await nextTick()
    expect(document.querySelector('.photo-ctr').textContent).toBe('2 / 3')
  })

  it('abre y cierra el lightbox', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    expect(document.querySelector('.lb-backdrop')).toBeNull()
    click(document.querySelector('.photo-expand-btn'))
    await nextTick()
    expect(document.querySelector('.lb-backdrop')).not.toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(document.querySelector('.lb-backdrop')).toBeNull()
  })

  it('quita una foto de la galería si falla su carga', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    const mainImg = document.querySelector('.photo-img')
    mainImg.dispatchEvent(new Event('error'))
    await nextTick()
    expect(document.querySelector('.photo-ctr').textContent).toBe('1 / 2')
  })

  it('navega hacia atrás con la flecha izquierda del teclado', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await nextTick()
    expect(document.querySelector('.photo-ctr').textContent).toBe('3 / 3')
  })

  it('pausa el auto-avance al pasar el mouse y lo reanuda al salir', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    const stage = document.querySelector('.phase-wrap')
    stage.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
    await nextTick()
    stage.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))
    await nextTick()
    // No debe lanzar error y el contador sigue mostrando la foto activa.
    expect(document.querySelector('.photo-ctr').textContent).toBe('1 / 3')
  })

  it('navega con los botones del lightbox y con gestos táctiles (swipe)', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    click(document.querySelector('.photo-expand-btn'))
    await nextTick()
    expect(document.querySelector('.lb-ctr').textContent).toBe('1 / 3')

    click(document.querySelector('.lb-nav--r'))
    await nextTick()
    expect(document.querySelector('.lb-ctr').textContent).toBe('2 / 3')

    click(document.querySelector('.lb-nav--l'))
    await nextTick()
    expect(document.querySelector('.lb-ctr').textContent).toBe('1 / 3')

    const backdrop = document.querySelector('.lb-backdrop')
    function touch(type, points) {
      const ev = new Event(type, { bubbles: true })
      ev.touches = points
      ev.changedTouches = points
      backdrop.dispatchEvent(ev)
    }
    touch('touchstart', [{ clientX: 200, clientY: 100 }])
    touch('touchend', [{ clientX: 50, clientY: 100 }]) // swipe izq → next
    await nextTick()
    expect(document.querySelector('.lb-ctr').textContent).toBe('2 / 3')

    touch('touchstart', [{ clientX: 50, clientY: 100 }])
    touch('touchend', [{ clientX: 200, clientY: 100 }]) // swipe der → prev
    await nextTick()
    expect(document.querySelector('.lb-ctr').textContent).toBe('1 / 3')
  })

  it('cierra el modal completo con Escape cuando el lightbox está cerrado', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    await new Promise(r => setTimeout(r, 300))
    await nextTick()
    expect(document.querySelector('.backdrop')).toBeNull()
  })
})

describe('ViaDetailModal — auto-avance de la galería', () => {
  beforeEach(() => {
    mockFetch({
      antes: ['https://x.com/antes1.jpg'],
      durante: ['https://x.com/durante1.jpg'],
      despues: ['https://x.com/despues1.jpg'],
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('avanza automáticamente de foto cada 5 segundos', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await vi.advanceTimersByTimeAsync(20)
    await vi.advanceTimersByTimeAsync(5000)
    await nextTick()
    expect(document.querySelector('.photo-ctr').textContent).toBe('2 / 3')
  })
})

describe('ViaDetailModal — animación de la barra de avance', () => {
  beforeEach(() => {
    mockFetch({ antes: [], durante: [], despues: [] })
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb) => { cb(performance.now() + 5000); return 1 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('anima la barra y el conteo tras 1400ms', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await vi.advanceTimersByTimeAsync(1500)
    await nextTick()
    expect(document.querySelector('.avance-pct').textContent).toContain('50')
  })
})

describe('ViaDetailModal — cierre', () => {
  beforeEach(() => {
    mockFetch({ antes: [], durante: [], despues: [] })
  })

  it('oculta el modal al hacer clic en ✕', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    click(document.querySelector('.btn-x'))
    await nextTick()
    await new Promise(r => setTimeout(r, 300))
    await nextTick()
    expect(document.querySelector('.backdrop')).toBeNull()
  })

  it('oculta el modal al hacer clic en "Cerrar"', async () => {
    wrapper = mount(ViaDetailModal, { props: { via: VIA_PROP }, attachTo: document.body })
    await waitFetch()
    click(document.querySelector('.btn-cerrar'))
    await nextTick()
    await new Promise(r => setTimeout(r, 300))
    await nextTick()
    expect(document.querySelector('.backdrop')).toBeNull()
  })
})
