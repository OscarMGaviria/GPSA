import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppTour from '../../../src/components/organisms/AppTour.vue'

const SELECTORS = ['.header-filters', '.map-container', '.cards-row', '.avance-row', '.chart-card']

function addTargets() {
  SELECTORS.forEach(sel => {
    const el = document.createElement('div')
    el.className = sel.slice(1)
    document.body.appendChild(el)
  })
}

function removeTargets() {
  SELECTORS.forEach(sel => {
    document.querySelector(sel)?.remove()
  })
}

function click(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

async function settle() {
  await nextTick()
  await new Promise(r => setTimeout(r, 0))
  await nextTick()
}

beforeEach(() => {
  localStorage.clear()
  addTargets()
})

afterEach(() => {
  removeTargets()
})

describe('AppTour — navegación de pasos', () => {
  it('muestra el primer paso al montar', async () => {
    const wrapper = mount(AppTour, { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.tt-step').textContent).toBe('1 / 5')
    expect(document.querySelector('.tt-title').textContent).toBe('Filtros de búsqueda')
    wrapper.unmount()
  })

  it('avanza al siguiente paso con "Siguiente"', async () => {
    const wrapper = mount(AppTour, { attachTo: document.body })
    await nextTick()
    click(document.querySelector('.tt-btn--primary'))
    await nextTick()
    expect(document.querySelector('.tt-step').textContent).toBe('2 / 5')
    expect(document.querySelector('.tt-title').textContent).toBe('Mapa interactivo')
    wrapper.unmount()
  })

  it('el botón anterior está deshabilitado en el primer paso', async () => {
    const wrapper = mount(AppTour, { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.tt-btn--icon').disabled).toBe(true)
    wrapper.unmount()
  })

  it('retrocede con el botón anterior', async () => {
    const wrapper = mount(AppTour, { attachTo: document.body })
    await nextTick()
    click(document.querySelector('.tt-btn--primary'))
    await nextTick()
    click(document.querySelector('.tt-btn--icon'))
    await nextTick()
    expect(document.querySelector('.tt-step').textContent).toBe('1 / 5')
    wrapper.unmount()
  })

  it('navega directamente a un paso haciendo clic en su dot', async () => {
    const wrapper = mount(AppTour, { attachTo: document.body })
    await nextTick()
    click(document.querySelectorAll('.tt-dot')[2])
    await nextTick()
    expect(document.querySelector('.tt-step').textContent).toBe('3 / 5')
    expect(document.querySelector('.tt-title').textContent).toBe('Indicadores principales')
    wrapper.unmount()
  })

  it('muestra "Finalizar" en el último paso', async () => {
    const wrapper = mount(AppTour, { attachTo: document.body })
    await nextTick()
    click(document.querySelectorAll('.tt-dot')[4])
    await nextTick()
    expect(document.querySelector('.tt-btn--primary').textContent).toContain('Finalizar')
    wrapper.unmount()
  })
})

describe('AppTour — cierre', () => {
  it('emite close y guarda en localStorage al hacer clic en el botón ✕', async () => {
    const wrapper = mount(AppTour, { attachTo: document.body })
    await nextTick()
    click(document.querySelector('.tt-close'))
    await nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(localStorage.getItem('simeva-tour-done')).toBe('1')
    wrapper.unmount()
  })

  it('emite close al hacer clic en "Saltar"', async () => {
    const wrapper = mount(AppTour, { attachTo: document.body })
    await nextTick()
    click(document.querySelector('.tt-btn--ghost'))
    await nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('emite close al hacer clic en un overlay', async () => {
    const wrapper = mount(AppTour, { attachTo: document.body })
    await settle()
    click(document.querySelector('.tour-overlay'))
    await settle()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('"Siguiente" en el último paso cierra el tour', async () => {
    const wrapper = mount(AppTour, { attachTo: document.body })
    await settle()
    click(document.querySelectorAll('.tt-dot')[4])
    await settle()
    expect(document.querySelector('.tt-step').textContent).toBe('5 / 5')
    click(document.querySelector('.tt-btn--primary'))
    await settle()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })
})
