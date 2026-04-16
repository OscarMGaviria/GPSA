import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RadarChart from '../components/atoms/RadarChart.vue'

const axes3 = [
  { label: 'Físico',     value: 80 },
  { label: 'Financiero', value: 60 },
  { label: 'Plazo',      value: 40 },
]

describe('RadarChart — renderizado SVG', () => {
  it('renderiza el SVG con el tamaño correcto', () => {
    const wrapper = mount(RadarChart, { props: { axes: axes3, size: 200 } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('200')
    expect(svg.attributes('height')).toBe('200')
  })

  it('renderiza 4 polígonos de nivel (25, 50, 75, 100)', () => {
    const wrapper = mount(RadarChart, { props: { axes: axes3 } })
    const polys = wrapper.findAll('polygon.radar-level')
    expect(polys.length).toBe(4)
  })

  it('renderiza tantas líneas de eje como axes', () => {
    const wrapper = mount(RadarChart, { props: { axes: axes3 } })
    const lines = wrapper.findAll('line.radar-axis')
    expect(lines.length).toBe(3)
  })

  it('renderiza un polígono de datos', () => {
    const wrapper = mount(RadarChart, { props: { axes: axes3 } })
    const poly = wrapper.find('polygon.radar-data')
    expect(poly.exists()).toBe(true)
    // El polígono de datos debe tener 3 pares de coordenadas
    const points = poly.attributes('points').trim().split(' ')
    expect(points.length).toBe(3)
  })

  it('renderiza tantos dots como axes', () => {
    const wrapper = mount(RadarChart, { props: { axes: axes3 } })
    const dots = wrapper.findAll('circle.radar-dot')
    expect(dots.length).toBe(3)
  })

  it('renderiza las etiquetas de cada eje', () => {
    const wrapper = mount(RadarChart, { props: { axes: axes3 } })
    const labels = wrapper.findAll('text.radar-label')
    expect(labels.length).toBe(3)
    expect(labels[0].text()).toBe('Físico')
    expect(labels[1].text()).toBe('Financiero')
    expect(labels[2].text()).toBe('Plazo')
  })

  it('renderiza los valores de cada eje con %', () => {
    const wrapper = mount(RadarChart, { props: { axes: axes3 } })
    const values = wrapper.findAll('text.radar-value')
    expect(values.length).toBe(3)
    expect(values[0].text()).toBe('80%')
    expect(values[1].text()).toBe('60%')
    expect(values[2].text()).toBe('40%')
  })

  it('no renderiza nada relevante cuando axes está vacío', () => {
    const wrapper = mount(RadarChart, { props: { axes: [] } })
    expect(wrapper.findAll('polygon.radar-data').length).toBe(1)
    expect(wrapper.find('polygon.radar-data').attributes('points')).toBe('')
    expect(wrapper.findAll('circle.radar-dot').length).toBe(0)
    expect(wrapper.findAll('line.radar-axis').length).toBe(0)
  })

  it('con 2 ejes renderiza 2 líneas, 2 dots y 2 labels', () => {
    const axes2 = [{ label: 'A', value: 50 }, { label: 'B', value: 75 }]
    const wrapper = mount(RadarChart, { props: { axes: axes2 } })
    expect(wrapper.findAll('line.radar-axis').length).toBe(2)
    expect(wrapper.findAll('circle.radar-dot').length).toBe(2)
    expect(wrapper.findAll('text.radar-label').length).toBe(2)
  })
})
