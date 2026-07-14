import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { defineComponent, h } from 'vue'
import AppShell from '../src/AppShell.vue'

describe('AppShell', () => {
  it('renderiza el componente asociado a la ruta activa via RouterView', async () => {
    const Home = defineComponent({ render: () => h('div', { class: 'home-stub' }, 'home') })
    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: '/', component: Home }],
    })
    router.push('/')
    await router.isReady()

    const wrapper = mount(AppShell, { global: { plugins: [router] } })
    expect(wrapper.find('.home-stub').exists()).toBe(true)
  })
})
