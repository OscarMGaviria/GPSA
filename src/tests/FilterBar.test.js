import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterBar from '../components/molecules/FilterBar.vue'

beforeEach(() => {
  window.innerWidth = 1280
  window.dispatchEvent(new Event('resize'))
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
