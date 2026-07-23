import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Selector from '../../../src/components/atoms/Selector.vue'

const OPTIONS = ['Todas las subregiones', 'Norte', 'Oriente', 'Occidente', 'Suroeste']

describe('Selector — renderizado y toggle', () => {
  it('muestra el modelValue en el trigger', () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: 'Norte' } })
    expect(wrapper.find('.trigger-value').text()).toBe('Norte')
  })

  it('muestra la primera opción si modelValue está vacío', () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' } })
    expect(wrapper.find('.trigger-value').text()).toBe('Todas las subregiones')
  })

  it('el dropdown no está visible al inicio', () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' } })
    expect(wrapper.find('.dropdown-panel').exists()).toBe(false)
  })

  it('el dropdown se abre al hacer clic en el trigger', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' } })
    await wrapper.find('.select-trigger').trigger('click')
    expect(wrapper.find('.dropdown-panel').exists()).toBe(true)
  })

  it('el dropdown se cierra al hacer clic de nuevo', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' } })
    await wrapper.find('.select-trigger').trigger('click')
    await wrapper.find('.select-trigger').trigger('click')
    expect(wrapper.find('.dropdown-panel').exists()).toBe(false)
  })

  it('enfoca el buscador al abrir en pantallas de escritorio (ancho > 1024)', async () => {
    const original = globalThis.innerWidth
    globalThis.innerWidth = 1280
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' }, attachTo: document.body })
    await wrapper.find('.select-trigger').trigger('click')
    await new Promise(r => setTimeout(r, 0))
    expect(document.activeElement).toBe(wrapper.find('.search-input').element)
    wrapper.unmount()
    globalThis.innerWidth = original
  })

  it('se cierra al hacer click fuera del contenedor', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' }, attachTo: document.body })
    await wrapper.find('.select-trigger').trigger('click')
    expect(wrapper.find('.dropdown-panel').exists()).toBe(true)
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.dropdown-panel').exists()).toBe(false)
    wrapper.unmount()
  })

  it('no se cierra al hacer click dentro del contenedor', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' }, attachTo: document.body })
    await wrapper.find('.select-trigger').trigger('click')
    wrapper.find('.select-container').element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.dropdown-panel').exists()).toBe(true)
    wrapper.unmount()
  })
})

describe('Selector — listado de opciones', () => {
  it('muestra todas las opciones cuando el dropdown está abierto', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' } })
    await wrapper.find('.select-trigger').trigger('click')
    const items = wrapper.findAll('.dropdown-item')
    expect(items.length).toBe(OPTIONS.length)
  })

  it('la opción seleccionada tiene la clase is-selected', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: 'Norte' } })
    await wrapper.find('.select-trigger').trigger('click')
    const selected = wrapper.find('.dropdown-item.is-selected')
    expect(selected.text()).toContain('Norte')
  })
})

describe('Selector — búsqueda y filtrado', () => {
  it('filtra las opciones según el texto de búsqueda', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' } })
    await wrapper.find('.select-trigger').trigger('click')
    await wrapper.find('.search-input').setValue('norte')
    const items = wrapper.findAll('.dropdown-item')
    expect(items.length).toBe(1)
    expect(items[0].text()).toContain('Norte')
  })

  it('es insensible a mayúsculas en la búsqueda', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' } })
    await wrapper.find('.select-trigger').trigger('click')
    await wrapper.find('.search-input').setValue('ORIENTE')
    const items = wrapper.findAll('.dropdown-item')
    expect(items.length).toBe(1)
  })

  it('muestra "Sin resultados" si ninguna opción coincide', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' } })
    await wrapper.find('.select-trigger').trigger('click')
    await wrapper.find('.search-input').setValue('zzz')
    expect(wrapper.find('.dropdown-empty').exists()).toBe(true)
    expect(wrapper.find('.dropdown-empty').text()).toBe('Sin resultados')
  })
})

describe('Selector — selección y emisión', () => {
  it('emite update:modelValue al seleccionar una opción', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' } })
    await wrapper.find('.select-trigger').trigger('click')
    await wrapper.findAll('.dropdown-item')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0][0]).toBe('Norte')
  })

  it('cierra el dropdown después de seleccionar', async () => {
    const wrapper = mount(Selector, { props: { options: OPTIONS, modelValue: '' } })
    await wrapper.find('.select-trigger').trigger('click')
    await wrapper.findAll('.dropdown-item')[1].trigger('click')
    expect(wrapper.find('.dropdown-panel').exists()).toBe(false)
  })
})
