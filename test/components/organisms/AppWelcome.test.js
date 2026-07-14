import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppWelcome from '../../../src/components/organisms/AppWelcome.vue'

function click(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

let wrapper
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('AppWelcome', () => {
  it('muestra el card de bienvenida al montar', async () => {
    wrapper = mount(AppWelcome, { attachTo: document.body })
    await nextTick()
    expect(document.querySelector('.welcome-card')).not.toBeNull()
    expect(document.querySelector('.welcome-title').textContent).toBe('¡Bienvenido a SIMEVA!')
  })

  it('emite close al hacer clic en "Explorar el proyecto"', async () => {
    wrapper = mount(AppWelcome, { attachTo: document.body })
    await nextTick()
    click(document.querySelector('.btn-start'))
    await nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('oculta el card tras cerrar', async () => {
    wrapper = mount(AppWelcome, { attachTo: document.body })
    await nextTick()
    click(document.querySelector('.btn-start'))
    await nextTick()
    expect(document.querySelector('.welcome-card')).toBeNull()
  })

  it('emite close al hacer clic fuera del card (en el overlay)', async () => {
    wrapper = mount(AppWelcome, { attachTo: document.body })
    await nextTick()
    click(document.querySelector('.welcome-overlay'))
    await nextTick()
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('no cierra al hacer clic dentro del card', async () => {
    wrapper = mount(AppWelcome, { attachTo: document.body })
    await nextTick()
    click(document.querySelector('.welcome-card'))
    await nextTick()
    expect(wrapper.emitted('close')).toBeFalsy()
  })
})
