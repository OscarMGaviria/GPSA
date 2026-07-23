import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import StatsDetailModal from '../../../src/components/organisms/StatsDetailModal.vue'

const VIAS_DETALLE = [
  { nombre: 'El Botón - Frontino', codigo: 'V1', municipio: 'FRONTINO', subregion: 'Occidente', circuito: 'Frontino - Nutibara', contratista: 'CONSORCIO A', km: 10, avance: 20 },
  { nombre: 'Guarne - Yolombal', codigo: 'V2', municipio: 'GUARNE', subregion: 'Oriente', circuito: 'Guarne - Yolombal', contratista: 'CONSORCIO B', km: 12, avance: 50 },
]

let wrapper
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

function click(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function dblclick(el) {
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
}

function setInputValue(el, value) {
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

async function settle() {
  await nextTick()
  await new Promise(r => setTimeout(r, 300))
  await nextTick()
}

describe('StatsDetailModal — vista "vias"', () => {
  it('muestra el título y las filas de circuito agrupadas', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.modal-titulo').textContent).toBe('Vías intervenidas')
    expect(document.querySelectorAll('.circuit-header-row').length).toBe(2)
  })

  it('filtra resultados según la búsqueda', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    setInputValue(document.querySelector('.search-input'), 'guarne')
    await nextTick()
    expect(document.querySelectorAll('.circuit-header-row').length).toBe(1)
    expect(document.querySelector('.search-count').textContent).toContain('1 resultado')
  })

  it('colapsa un circuito al hacer clic en su cabecera', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    expect(document.querySelectorAll('.via-row').length).toBe(2)
    click(document.querySelectorAll('.circuit-header-row')[0])
    await nextTick()
    expect(document.querySelectorAll('.via-row').length).toBe(1)
  })

  it('"Colapsar todo" / "Expandir todo" alterna todos los circuitos', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    click(document.querySelector('.btn-expand-all'))
    await nextTick()
    expect(document.querySelectorAll('.via-row').length).toBe(0)
    expect(document.querySelector('.btn-expand-all').textContent).toContain('Expandir todo')
    click(document.querySelector('.btn-expand-all'))
    await nextTick()
    expect(document.querySelectorAll('.via-row').length).toBe(2)
  })

  it('emite fly-via al hacer clic en "ver en el mapa"', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    click(document.querySelector('.btn-ver-mapa'))
    expect(wrapper.emitted('fly-via')).toBeTruthy()
    expect(wrapper.emitted('fly-via')[0][0].nombre).toBe('El Botón - Frontino')
  })

  it('ordena por km al hacer clic en el encabezado', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    const kmHeader = [...document.querySelectorAll('th.sortable')].find(th => th.textContent.includes('Km'))
    click(kmHeader)
    await nextTick()
    expect(kmHeader.querySelector('.sort-ic').textContent).toBe('↑')
  })

  it('ordena por circuito y por subregión, e invierte el orden al repetir clic', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    const circuitoHeader = [...document.querySelectorAll('th.sortable')].find(th => th.textContent.includes('Circuito'))
    click(circuitoHeader)
    await nextTick()
    expect(circuitoHeader.querySelector('.sort-ic').textContent).toBe('↑')
    click(circuitoHeader) // repetir: invierte a descendente
    await nextTick()
    expect(circuitoHeader.querySelector('.sort-ic').textContent).toBe('↓')

    const subHeader = [...document.querySelectorAll('th.sortable')].find(th => th.textContent.includes('Subregión'))
    click(subHeader)
    await nextTick()
    expect(subHeader.querySelector('.sort-ic').textContent).toBe('↑')
  })

  it('muestra la fila vacía cuando la búsqueda no matchea nada', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    setInputValue(document.querySelector('.search-input'), 'zzz-inexistente')
    await nextTick()
    expect(document.querySelector('.empty-row')).not.toBeNull()
  })
})

describe('StatsDetailModal — vista "longitud"', () => {
  it('muestra el título y agrupa por municipio, expandido por defecto', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'longitud', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.modal-titulo').textContent).toBe('Longitud total')
    expect(document.querySelectorAll('.mpio-header-row').length).toBe(2)
    expect(document.querySelectorAll('.via-row').length).toBe(2)
  })

  it('colapsa y expande un municipio individual', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'longitud', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    click(document.querySelectorAll('.mpio-header-row')[0])
    await nextTick()
    expect(document.querySelectorAll('.via-row').length).toBe(1)
    click(document.querySelectorAll('.mpio-header-row')[0])
    await nextTick()
    expect(document.querySelectorAll('.via-row').length).toBe(2)
  })

  it('"Colapsar todo" / "Expandir todo" alterna todos los municipios', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'longitud', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    click(document.querySelector('.btn-expand-all'))
    await nextTick()
    expect(document.querySelectorAll('.via-row').length).toBe(0)
    click(document.querySelector('.btn-expand-all'))
    await nextTick()
    expect(document.querySelectorAll('.via-row').length).toBe(2)
  })
})

describe('StatsDetailModal — vista "municipios" y "circuitos"', () => {
  it('renderiza la tabla de municipios', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'municipios', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.modal-titulo').textContent).toBe('Municipios')
    expect(document.querySelectorAll('.data-row').length).toBe(2)
  })

  it('ordena la tabla de municipios por cada columna disponible', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'municipios', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    const headers = [...document.querySelectorAll('th.sortable')]
    // "Municipio" usa la clave por defecto ('nombre'), así que el primer clic invierte a descendente.
    const expected = { Municipio: '↓', Subregión: '↑', Vías: '↑', Longitud: '↑' }
    for (const [label, icon] of Object.entries(expected)) {
      const th = headers.find(h => h.textContent.includes(label))
      click(th)
      await nextTick()
      expect(th.querySelector('.sort-ic').textContent).toBe(icon)
    }
  })

  it('renderiza la tabla de circuitos y emite open-via en doble clic', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'circuitos', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.modal-titulo').textContent).toBe('Circuitos viales')
    dblclick(document.querySelector('.data-row--dblclick'))
    await nextTick()
    expect(wrapper.emitted('open-via')).toBeTruthy()
  })
})

describe('StatsDetailModal — cierre', () => {
  // Nota: el emit 'close' real depende del hook @after-leave de <Transition>,
  // que requiere temporización CSS real que jsdom no simula de forma confiable.
  // Verificamos el efecto práctico: el modal deja de estar en el DOM.
  it('oculta el modal al hacer clic en el botón ✕', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    click(document.querySelector('.btn-close'))
    await settle()
    expect(document.querySelector('.modal-backdrop')).toBeNull()
  })

  it('oculta el modal al presionar Escape', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await settle()
    expect(document.querySelector('.modal-backdrop')).toBeNull()
  })

  it('oculta el modal al hacer clic fuera de él (backdrop)', async () => {
    wrapper = mount(StatsDetailModal, { props: { tipo: 'vias', viasDetalle: VIAS_DETALLE }, attachTo: document.body })
    await nextTick()
    click(document.querySelector('.modal-backdrop'))
    await settle()
    expect(document.querySelector('.modal-backdrop')).toBeNull()
  })
})
