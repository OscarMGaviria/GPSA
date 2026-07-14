import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LabeledSelector from '../../../src/components/molecules/LabeledSelector.vue'

const OPTIONS = ['Todas', 'Norte', 'Oriente']

describe('LabeledSelector', () => {
  it('muestra el label', () => {
    const wrapper = mount(LabeledSelector, { props: { label: 'Subregión', options: OPTIONS, modelValue: '' } })
    expect(wrapper.find('.ls-label').text()).toBe('Subregión')
  })

  it('pasa el modelValue y las opciones al Selector interno', () => {
    const wrapper = mount(LabeledSelector, { props: { label: 'Subregión', options: OPTIONS, modelValue: 'Norte' } })
    expect(wrapper.find('.trigger-value').text()).toBe('Norte')
  })

  it('re-emite update:modelValue del Selector interno', async () => {
    const wrapper = mount(LabeledSelector, { props: { label: 'Subregión', options: OPTIONS, modelValue: '' } })
    await wrapper.find('.select-trigger').trigger('click')
    await wrapper.findAll('.dropdown-item')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Norte'])
  })
})
