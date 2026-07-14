import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCard from '../../../src/components/atoms/StatCard.vue'

describe('StatCard', () => {
  it('muestra el título correctamente', () => {
    const wrapper = mount(StatCard, {
      props: { title: 'Vías intervenidas', value: 47 },
    })
    expect(wrapper.text()).toContain('Vías intervenidas')
  })

  it('muestra el valor numérico', () => {
    const wrapper = mount(StatCard, {
      props: { title: 'Circuitos', value: 29 },
    })
    expect(wrapper.text()).toContain('29')
  })

  it('muestra la unidad cuando se pasa el prop unit', () => {
    const wrapper = mount(StatCard, {
      props: { title: 'Longitud', value: '634.43', unit: 'km' },
    })
    expect(wrapper.text()).toContain('km')
  })

  it('NO muestra unidad si el prop unit no se pasa', () => {
    const wrapper = mount(StatCard, {
      props: { title: 'Municipios', value: 42 },
    })
    expect(wrapper.find('.card-unit').exists()).toBe(false)
  })

  it('muestra el ícono ⓘ cuando se pasa tooltip', () => {
    const wrapper = mount(StatCard, {
      props: { title: 'Municipios', value: 42, tooltip: 'Texto de ayuda' },
    })
    expect(wrapper.find('.card-info').exists()).toBe(true)
    expect(wrapper.find('.card-info').attributes('data-tip')).toBe('Texto de ayuda')
  })

  it('NO muestra el ícono ⓘ cuando no hay tooltip', () => {
    const wrapper = mount(StatCard, {
      props: { title: 'Municipios', value: 42 },
    })
    expect(wrapper.find('.card-info').exists()).toBe(false)
  })

  it('emite el evento click al hacer clic en la card', async () => {
    const wrapper = mount(StatCard, {
      props: { title: 'Circuitos', value: 29 },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
