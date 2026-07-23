import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterBar from '../../../src/components/molecules/FilterBar.vue'

beforeEach(() => {
  globalThis.innerWidth = 1280
  globalThis.dispatchEvent(new Event('resize'))
})

const defaultProps = {
  subregionOptions: ['Todas las subregiones', 'Norte', 'Oriente'],
  municipioOptions: ['Todos los municipios', 'Medellín', 'Bello'],
  circuitoOptions:  ['Todos los circuitos', 'Circuito A'],
  activeFilters: null,
}

describe('FilterBar — renderizado', () => {
  it('renderiza el input de búsqueda', () => {
    const wrapper = mount(FilterBar, { props: defaultProps })
    expect(wrapper.find('.search-input').exists()).toBe(true)
  })

  it('renderiza el botón de limpiar filtros', () => {
    const wrapper = mount(FilterBar, { props: defaultProps })
    expect(wrapper.find('.btn-clear').exists()).toBe(true)
  })
})

describe('FilterBar — emits al cambiar inputs', () => {
  it('emite filter-change al escribir en el input de búsqueda', async () => {
    const wrapper = mount(FilterBar, { props: defaultProps })
    await wrapper.find('.search-input').setValue('Frontino')
    await wrapper.find('.search-input').trigger('input')
    expect(wrapper.emitted('filter-change')).toBeTruthy()
    const payload = wrapper.emitted('filter-change')[0][0]
    expect(payload.search).toBe('Frontino')
  })

  it('emite filter-change al hacer clic en el botón de limpiar', async () => {
    const wrapper = mount(FilterBar, { props: defaultProps })
    await wrapper.setProps({
      activeFilters: { search: 'Frontino', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' }
    })
    await wrapper.find('.btn-clear').trigger('click')
    expect(wrapper.emitted('filter-change')).toBeTruthy()
  })

  it('al limpiar, el payload tiene los valores por defecto', async () => {
    const wrapper = mount(FilterBar, { props: defaultProps })
    // Primero establecemos un valor en el input
    await wrapper.find('.search-input').setValue('texto')
    await wrapper.find('.search-input').trigger('input')
    // Luego limpiamos
    await wrapper.find('.btn-clear').trigger('click')
    const emits = wrapper.emitted('filter-change')
    const lastPayload = emits[emits.length - 1][0]
    expect(lastPayload.search).toBe('')
    expect(lastPayload.subregion).toBe('Todas las subregiones')
    expect(lastPayload.municipio).toBe('Todos los municipios')
    expect(lastPayload.circuito).toBe('Todos los circuitos')
  })
})

describe('FilterBar — sincronización con activeFilters', () => {
  it('sincroniza el input de búsqueda con activeFilters.search', async () => {
    const wrapper = mount(FilterBar, { props: defaultProps })
    await wrapper.setProps({
      activeFilters: { search: 'Medellín', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.search-input').element.value).toBe('Medellín')
  })

  it('al actualizar activeFilters, se refleja en el input', async () => {
    const wrapper = mount(FilterBar, { props: defaultProps })
    await wrapper.setProps({
      activeFilters: { search: 'nuevo texto', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' },
    })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.search-input').element.value).toBe('nuevo texto')
  })
})

describe('FilterBar — cambio de subregión resetea municipio/circuito', () => {
  it('al elegir una subregión, resetea municipio y circuito y emite filter-change', async () => {
    const wrapper = mount(FilterBar, { props: defaultProps })
    const triggers = wrapper.findAll('.select-trigger')
    await triggers[0].trigger('click') // abre el selector de subregión
    const items = wrapper.findAll('.dropdown-item')
    const norteItem = items.find(i => i.text() === 'Norte')
    await norteItem.trigger('click')
    const payload = wrapper.emitted('filter-change').at(-1)[0]
    expect(payload.subregion).toBe('Norte')
    expect(payload.municipio).toBe('Todos los municipios')
    expect(payload.circuito).toBe('Todos los circuitos')
  })

  it('no resetea nada mientras se está sincronizando desde activeFilters', async () => {
    const wrapper = mount(FilterBar, { props: defaultProps })
    await wrapper.setProps({
      activeFilters: { search: '', subregion: 'Norte', municipio: 'Medellín', circuito: 'Circuito A' },
    })
    await wrapper.vm.$nextTick()
    // No debe emitir filter-change solo por la sincronización externa
    expect(wrapper.emitted('filter-change')).toBeFalsy()
  })
})

describe('FilterBar — atajo de teclado Escape', () => {
  it('limpia los filtros al presionar Escape', async () => {
    const wrapper = mount(FilterBar, { props: defaultProps, attachTo: document.body })
    await wrapper.find('.search-input').setValue('texto')
    await wrapper.find('.search-input').trigger('input')
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    const lastPayload = wrapper.emitted('filter-change').at(-1)[0]
    expect(lastPayload.search).toBe('')
    wrapper.unmount()
  })
})

describe('FilterBar — vista móvil', () => {
  it('muestra los botones "Limpiar" y "Aplicar" en pantallas angostas', async () => {
    globalThis.innerWidth = 800
    const wrapper = mount(FilterBar, { props: defaultProps })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.btn-apply-mobile').exists()).toBe(true)
    expect(wrapper.find('.search-wrapper').exists()).toBe(false)

    await wrapper.setProps({
      activeFilters: { search: 'algo', subregion: 'Norte', municipio: 'Medellín', circuito: 'Circuito A' },
    })
    await wrapper.find('.btn-clear-mobile').trigger('click')
    expect(wrapper.emitted('filter-change').at(-1)[0].search).toBe('')

    await wrapper.find('.btn-apply-mobile').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    globalThis.innerWidth = 1280
  })

  it('cambia a vista móvil dinámicamente al redimensionar la ventana', async () => {
    const wrapper = mount(FilterBar, { props: defaultProps })
    expect(wrapper.find('.btn-apply-mobile').exists()).toBe(false)
    globalThis.innerWidth = 800
    globalThis.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.btn-apply-mobile').exists()).toBe(true)
    globalThis.innerWidth = 1280
    globalThis.dispatchEvent(new Event('resize'))
  })
})
