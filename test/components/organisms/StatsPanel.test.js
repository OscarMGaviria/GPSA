import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StatsPanel from '../../../src/components/organisms/StatsPanel.vue'

const VIAS_DETALLE = [
  { nombre: 'Via A', municipio: 'FRONTINO', subregion: 'Occidente', circuito: 'C1', km: 10, estabilizado: 5, avance: 50, avanceFin: 40, fechaIni: '2024-01-01', plazoMeses: 12 },
  { nombre: 'Via B', municipio: 'GUARNE', subregion: 'Oriente', circuito: 'C2', km: 20, estabilizado: 20, avance: 100, avanceFin: 80, fechaIni: '2024-02-01', plazoMeses: 6 },
]

const SUBREGIONES = [
  { name: 'Occidente', km: 30, pct: 60 },
  { name: 'Oriente', km: 20, pct: 40 },
  { name: 'Valle de Aburra', km: 5, pct: 10 },
]

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb) => { cb(performance.now() + 5000); return 1 })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function waitAnimation() {
  await new Promise(r => setTimeout(r, 400))
}

describe('StatsPanel — renderizado de KPIs', () => {
  it('muestra el skeleton cuando loading es true', () => {
    const wrapper = mount(StatsPanel, { props: { loading: true } })
    expect(wrapper.findAll('.stat-skeleton').length).toBe(4)
    expect(wrapper.findAll('.stat-card').length).toBe(0)
  })

  it('muestra los valores de las 4 cards tras la animación de conteo', async () => {
    const wrapper = mount(StatsPanel, {
      props: { viasIntervenidas: 47, longitudTotal: 634.43, municipios: 42, circuitos: 29 },
    })
    await waitAnimation()
    expect(wrapper.findAll('.stat-card').length).toBe(4)
    expect(wrapper.text()).toContain('47')
    expect(wrapper.text()).toContain('42')
    expect(wrapper.text()).toContain('29')
    expect(wrapper.text()).toContain('634,43')
  })
})

describe('StatsPanel — modal de detalle', () => {
  it('abre el modal correspondiente al hacer clic en la card de vías', async () => {
    const wrapper = mount(StatsPanel, { props: { viasDetalle: VIAS_DETALLE } })
    await waitAnimation()
    await wrapper.findAll('.stat-card')[0].trigger('click')
    expect(wrapper.findComponent({ name: 'StatsDetailModal' }).exists()).toBe(true)
  })

  it('cierra el modal al emitir close', async () => {
    const wrapper = mount(StatsPanel, { props: { viasDetalle: VIAS_DETALLE } })
    await waitAnimation()
    await wrapper.findAll('.stat-card')[0].trigger('click')
    await wrapper.findComponent({ name: 'StatsDetailModal' }).vm.$emit('close')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'StatsDetailModal' }).exists()).toBe(false)
  })

  it('reenvía open-via cerrando el modal', async () => {
    const wrapper = mount(StatsPanel, { props: { viasDetalle: VIAS_DETALLE } })
    await waitAnimation()
    await wrapper.findAll('.stat-card')[0].trigger('click')
    const modal = wrapper.findComponent({ name: 'StatsDetailModal' })
    await modal.vm.$emit('open-via', { nombre: 'Via A' })
    expect(wrapper.emitted('open-via')?.[0]).toEqual([{ nombre: 'Via A' }])
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'StatsDetailModal' }).exists()).toBe(false)
  })

  it('reenvía fly-via cerrando el modal', async () => {
    const wrapper = mount(StatsPanel, { props: { viasDetalle: VIAS_DETALLE } })
    await waitAnimation()
    await wrapper.findAll('.stat-card')[0].trigger('click')
    const modal = wrapper.findComponent({ name: 'StatsDetailModal' })
    await modal.vm.$emit('fly-via', { nombre: 'Via B' })
    expect(wrapper.emitted('fly-via')?.[0]).toEqual([{ nombre: 'Via B' }])
  })
})

describe('StatsPanel — radar y avance en km', () => {
  it('calcula los ejes del radar a partir de viasDetalle', async () => {
    const wrapper = mount(StatsPanel, { props: { viasDetalle: VIAS_DETALLE } })
    await waitAnimation()
    expect(wrapper.text()).toContain('Físico')
    expect(wrapper.text()).toContain('Financiero')
  })

  it('muestra el porcentaje de avance en km calculado', async () => {
    const wrapper = mount(StatsPanel, { props: { viasDetalle: VIAS_DETALLE } })
    await waitAnimation()
    // (5 + 20) / (10 + 20) = 83.33% redondeado
    expect(wrapper.find('.km-pct-label').text()).toContain('83')
  })
})

describe('StatsPanel — gráfica por subregión', () => {
  it('excluye "Valle de Aburra" de las barras', async () => {
    const wrapper = mount(StatsPanel, { props: { subregiones: SUBREGIONES } })
    await waitAnimation()
    const labels = wrapper.findAll('.bar-label').map(l => l.attributes('title'))
    expect(labels).toContain('Occidente')
    expect(labels).toContain('Oriente')
    expect(labels).not.toContain('Valle de Aburra')
  })

  it('emite filter-subregion al hacer clic en una barra', async () => {
    const wrapper = mount(StatsPanel, { props: { subregiones: SUBREGIONES, activeSubregion: '' } })
    await waitAnimation()
    await wrapper.findAll('.bar-col')[0].trigger('click')
    expect(wrapper.emitted('filter-subregion')?.[0]).toEqual(['Occidente'])
  })

  it('quita el filtro si la subregión ya estaba activa', async () => {
    const wrapper = mount(StatsPanel, { props: { subregiones: SUBREGIONES, activeSubregion: 'Occidente' } })
    await waitAnimation()
    await wrapper.findAll('.bar-col')[0].trigger('click')
    expect(wrapper.emitted('filter-subregion')?.[0]).toEqual(['Todas las subregiones'])
  })
})

describe('StatsPanel — bottom sheet móvil', () => {
  it('cicla el estado del panel móvil al hacer clic en el handle', async () => {
    const wrapper = mount(StatsPanel)
    await waitAnimation()
    expect(wrapper.classes()).toContain('mobile-collapsed')
    await wrapper.find('.bottom-sheet-handle-wrapper').trigger('click')
    expect(wrapper.classes()).toContain('mobile-half')
    await wrapper.find('.bottom-sheet-handle-wrapper').trigger('click')
    expect(wrapper.classes()).toContain('mobile-expanded')
    await wrapper.find('.bottom-sheet-handle-wrapper').trigger('click')
    expect(wrapper.classes()).toContain('mobile-collapsed')
  })
})
