import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressBar from '../../../src/components/atoms/ProgressBar.vue'

describe('ProgressBar', () => {
  it('muestra el porcentaje como texto cuando showLabel es true', () => {
    const wrapper = mount(ProgressBar, { props: { pct: 75 } })
    expect(wrapper.text()).toContain('75%')
  })

  it('NO muestra el label cuando showLabel es false', () => {
    const wrapper = mount(ProgressBar, { props: { pct: 75, showLabel: false } })
    expect(wrapper.find('.pbar-label').exists()).toBe(false)
  })

  it('aplica el color de relleno pasado por prop', () => {
    const wrapper = mount(ProgressBar, {
      props: { pct: 50, color: '#ff0000' },
    })
    const fill = wrapper.find('.pbar-fill')
    expect(fill.attributes('style')).toContain('background: rgb(255, 0, 0)')
  })

  it('aplica el color del track pasado por prop', () => {
    const wrapper = mount(ProgressBar, {
      props: { pct: 50, trackColor: '#cccccc' },
    })
    const track = wrapper.find('.pbar-track')
    expect(track.attributes('style')).toContain('background: rgb(204, 204, 204)')
  })

  it('aplica el transform scaleX correcto según pct', () => {
    const wrapper = mount(ProgressBar, { props: { pct: 60 } })
    const fill = wrapper.find('.pbar-fill')
    expect(fill.attributes('style')).toContain('scaleX(0.6)')
  })

  it('aplica scaleX(0) cuando pct es 0', () => {
    const wrapper = mount(ProgressBar, { props: { pct: 0 } })
    const fill = wrapper.find('.pbar-fill')
    expect(fill.attributes('style')).toContain('scaleX(0)')
  })

  it('aplica la altura correcta al track', () => {
    const wrapper = mount(ProgressBar, { props: { pct: 50, height: 14 } })
    const track = wrapper.find('.pbar-track')
    expect(track.attributes('style')).toContain('height: 14px')
  })
})
