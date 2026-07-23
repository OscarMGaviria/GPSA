import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AppHeader from '../../../src/components/organisms/AppHeader.vue'

beforeEach(() => {
  globalThis.innerWidth = 1280
  globalThis.dispatchEvent(new Event('resize'))
})

const defaultProps = {
  subregionOptions: ['Todas las subregiones', 'Norte'],
  municipioOptions: ['Todos los municipios', 'Medellín'],
  circuitoOptions: ['Todos los circuitos', 'Circuito A'],
  activeFilters: null,
}

describe('AppHeader — renderizado', () => {
  it('muestra el título y subtítulo por defecto', () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    expect(wrapper.find('.header-title').text()).toBe('Pavimentación Vial')
    expect(wrapper.find('.header-subtitle.desktop-only').text()).toContain('SIMEVA')
  })

  it('muestra un título personalizado', () => {
    const wrapper = mount(AppHeader, { props: { ...defaultProps, title: 'Otro título' } })
    expect(wrapper.find('.header-title').text()).toBe('Otro título')
  })

  it('no muestra el drawer móvil por defecto', () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    expect(wrapper.find('.drawer-backdrop').exists()).toBe(false)
  })
})

describe('AppHeader — panel toggle', () => {
  it('muestra el ícono de colapsar cuando panelOpen es true', () => {
    const wrapper = mount(AppHeader, { props: { ...defaultProps, panelOpen: true } })
    expect(wrapper.find('.btn-panel[aria-label="Colapsar panel"]').exists()).toBe(true)
  })

  it('muestra el ícono de expandir cuando panelOpen es false', () => {
    const wrapper = mount(AppHeader, { props: { ...defaultProps, panelOpen: false } })
    expect(wrapper.find('.btn-panel[aria-label="Expandir panel"]').exists()).toBe(true)
  })

  it('emite toggle-panel al hacer clic en el botón de panel', async () => {
    const wrapper = mount(AppHeader, { props: { ...defaultProps, panelOpen: true } })
    await wrapper.find('.btn-panel[aria-label="Colapsar panel"]').trigger('click')
    expect(wrapper.emitted('toggle-panel')).toBeTruthy()
  })

  it('emite start-tour al hacer clic en el botón de ayuda', async () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    await wrapper.find('.btn-panel[aria-label="Abrir tutorial"]').trigger('click')
    expect(wrapper.emitted('start-tour')).toBeTruthy()
  })
})

describe('AppHeader — filtros (FilterBar embebido)', () => {
  it('re-emite filter-change desde el FilterBar de escritorio', async () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    await wrapper.find('.desktop-only .search-input').setValue('Medellín')
    await wrapper.find('.desktop-only .search-input').trigger('input')
    expect(wrapper.emitted('filter-change')).toBeTruthy()
  })
})

describe('AppHeader — drawer móvil y badge de filtros', () => {
  it('no muestra el badge de filtros activos si no hay filtros', () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    expect(wrapper.find('.filter-badge').exists()).toBe(false)
  })

  it('muestra el badge con la cantidad correcta de filtros activos', () => {
    const wrapper = mount(AppHeader, {
      props: {
        ...defaultProps,
        activeFilters: { search: 'algo', subregion: 'Norte', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' },
      },
    })
    expect(wrapper.find('.filter-badge').text()).toBe('2')
  })

  it('abre el drawer móvil al hacer clic en el botón de filtros', async () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    await wrapper.find('.btn-mobile-filter').trigger('click')
    expect(wrapper.find('.drawer-backdrop').exists()).toBe(true)
  })

  it('cierra el drawer al hacer clic en el botón de cerrar', async () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    await wrapper.find('.btn-mobile-filter').trigger('click')
    await wrapper.find('.drawer-close').trigger('click')
    expect(wrapper.find('.drawer-backdrop').exists()).toBe(false)
  })

  it('cierra el drawer al hacer clic en el fondo (backdrop)', async () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    await wrapper.find('.btn-mobile-filter').trigger('click')
    await wrapper.find('.drawer-backdrop').trigger('click')
    expect(wrapper.find('.drawer-backdrop').exists()).toBe(false)
  })

  it('cierra el drawer desde el botón "Aplicar" del FilterBar móvil', async () => {
    // El FilterBar interno decide su propio layout móvil según el ancho real de ventana.
    globalThis.innerWidth = 800
    const wrapper = mount(AppHeader, { props: defaultProps })
    await wrapper.find('.btn-mobile-filter').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('.drawer-content .btn-apply-mobile').trigger('click')
    expect(wrapper.find('.drawer-backdrop').exists()).toBe(false)
    globalThis.innerWidth = 1280
  })
})
