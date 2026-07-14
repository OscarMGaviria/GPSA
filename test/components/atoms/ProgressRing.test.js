import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressRing from '../../../src/components/atoms/ProgressRing.vue'

// Fórmulas internas del componente
const r    = (size, stroke) => (size - stroke) / 2
const circ = (size, stroke) => 2 * Math.PI * r(size, stroke)
const dash  = (pct, size, stroke) => (pct / 100) * circ(size, stroke)

describe('ProgressRing — geometría SVG', () => {
  it('calcula el radio correctamente con los valores por defecto (size=120, stroke=9)', () => {
    // r = (120 - 9) / 2 = 55.5
    const expected = (120 - 9) / 2
    const wrapper = mount(ProgressRing, { props: { pct: 0 } })
    const circle = wrapper.findAll('circle')[0]
    expect(Number.parseFloat(circle.attributes('r'))).toBeCloseTo(expected, 1)
  })

  it('el stroke-dasharray refleja el pct=50 correctamente', () => {
    const size = 120, stroke = 9, pct = 50
    const expectedDash = dash(pct, size, stroke)
    const expectedCirc = circ(size, stroke)
    const wrapper = mount(ProgressRing, { props: { pct } })
    const arc = wrapper.find('.ring-arc')
    const dasharray = arc.attributes('stroke-dasharray')
    const [d] = dasharray.split(' ').map(Number.parseFloat)
    expect(d).toBeCloseTo(expectedDash, 1)
    const [, c] = dasharray.split(' ').map(Number.parseFloat)
    expect(c).toBeCloseTo(expectedCirc, 1)
  })

  it('stroke-dasharray es 0 cuando pct=0', () => {
    const wrapper = mount(ProgressRing, { props: { pct: 0 } })
    const arc = wrapper.find('.ring-arc')
    const [d] = arc.attributes('stroke-dasharray').split(' ').map(Number.parseFloat)
    expect(d).toBeCloseTo(0, 1)
  })

  it('el cx es la mitad del tamaño', () => {
    const size = 160
    const wrapper = mount(ProgressRing, { props: { pct: 0, size } })
    const circle = wrapper.find('circle')
    expect(Number.parseFloat(circle.attributes('cx'))).toBeCloseTo(size / 2, 1)
  })
})

describe('ProgressRing — renderizado de props', () => {
  it('muestra el porcentaje en pantalla', () => {
    const wrapper = mount(ProgressRing, { props: { pct: 73 } })
    expect(wrapper.text()).toContain('73')
    expect(wrapper.text()).toContain('%')
  })

  it('muestra el label cuando se pasa', () => {
    const wrapper = mount(ProgressRing, { props: { pct: 10, label: 'Avance físico' } })
    expect(wrapper.find('.ring-label').text()).toBe('Avance físico')
  })

  it('no muestra .ring-label cuando no hay label', () => {
    const wrapper = mount(ProgressRing, { props: { pct: 10 } })
    expect(wrapper.find('.ring-label').exists()).toBe(false)
  })

  it('muestra el sublabel cuando se pasa', () => {
    const wrapper = mount(ProgressRing, { props: { pct: 10, sublabel: 'de 100 km' } })
    expect(wrapper.find('.ring-sublabel').text()).toBe('de 100 km')
  })

  it('no muestra .ring-sublabel cuando no hay sublabel', () => {
    const wrapper = mount(ProgressRing, { props: { pct: 10 } })
    expect(wrapper.find('.ring-sublabel').exists()).toBe(false)
  })

  it('aplica el color al arco de progreso', () => {
    const wrapper = mount(ProgressRing, { props: { pct: 50, color: '#ff0000' } })
    const arc = wrapper.find('.ring-arc')
    expect(arc.attributes('stroke')).toBe('#ff0000')
  })

  it('aplica el trackColor al círculo de fondo', () => {
    const wrapper = mount(ProgressRing, { props: { pct: 50, trackColor: '#cccccc' } })
    const track = wrapper.findAll('circle')[0]
    expect(track.attributes('stroke')).toBe('#cccccc')
  })
})
