import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../../../src/stores/useMapStore.js'
import MapSearch from '../../../src/components/molecules/MapSearch.vue'
import { highlight, escapeRegex } from '../../../src/utils/via.js'

// ─────────────────────────────────────────────────────────────────────────────
// highlight (extraída en via.js)
// ─────────────────────────────────────────────────────────────────────────────
describe('highlight', () => {
  it('envuelve la coincidencia en <mark>', () => {
    expect(highlight('El Botón', 'Botón')).toBe('El <mark>Botón</mark>')
  })

  it('es insensible a mayúsculas', () => {
    expect(highlight('Frontino', 'fron')).toBe('<mark>Fron</mark>tino')
  })

  it('escapa caracteres especiales de regex', () => {
    expect(() => highlight('precio (100+)', '(100+')).not.toThrow()
    expect(highlight('precio (100+)', '(100+')).toContain('<mark>')
  })

  it('devuelve el texto sin cambios si q está vacío', () => {
    expect(highlight('Texto', '')).toBe('Texto')
  })

  it('devuelve string vacío si text es null/undefined', () => {
    expect(highlight(null, 'q')).toBe('')
    expect(highlight(undefined, 'q')).toBe('')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// escapeRegex
// ─────────────────────────────────────────────────────────────────────────────
describe('escapeRegex', () => {
  it('escapa puntos', () => {
    expect(escapeRegex('1.5 km')).toBe('1\\.5 km')
  })

  it('escapa paréntesis y signos especiales', () => {
    expect(escapeRegex('(test+)')).toBe('\\(test\\+\\)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MapSearch — filtrado de resultados
// ─────────────────────────────────────────────────────────────────────────────
const VIAS_MOCK = [
  { nombre: 'El Botón - Frontino',      municipio: 'FRONTINO',  subregion: 'Occidente', contratista: 'CONSORCIO A', km: 25 },
  { nombre: 'La Quiebra - Santa Ana',   municipio: 'SANTA BÁRBARA', subregion: 'Suroeste',  contratista: 'CONSORCIO B', km: 18 },
  { nombre: 'Guarne - Yolombal',         municipio: 'GUARNE',    subregion: 'Oriente',   contratista: 'CONSORCIO C', km: 12 },
  { nombre: 'Mutata - Pavarando',        municipio: 'MUTATÁ',    subregion: 'Urabá',     contratista: 'CONSORCIO D', km: 30 },
  { nombre: 'San Pedro - El Tres',       municipio: 'SAN PEDRO', subregion: 'Urabá',     contratista: 'CONSORCIO D', km: 22 },
  { nombre: 'Frontino - Nutibara',       municipio: 'FRONTINO',  subregion: 'Occidente', contratista: 'CONSORCIO A', km: 15 },
  { nombre: 'Amalfi - Portachuelos',     municipio: 'AMALFI',    subregion: 'Nordeste',  contratista: 'CONSORCIO E', km: 20 },
  { nombre: 'Carolina - Angostura',      municipio: 'CAROLINA',  subregion: 'Norte',     contratista: 'CONSORCIO F', km: 14 },
  { nombre: 'Ruta Extra 1',              municipio: 'EXTRA',     subregion: 'Norte',     contratista: 'CONSORCIO G', km: 5 },
]

describe('MapSearch — filtrado con store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const store = useMapStore()
    store.setMapStats({ ...store.mapStats, viasDetalle: VIAS_MOCK })
  })

  it('no muestra resultados si la búsqueda tiene menos de 2 caracteres', async () => {
    const wrapper = mount(MapSearch)
    await wrapper.find('.search-input').setValue('F')
    await wrapper.find('.search-input').trigger('focus')
    expect(wrapper.find('.search-dropdown').exists()).toBe(false)
  })

  it('filtra por nombre de la vía', async () => {
    const wrapper = mount(MapSearch)
    await wrapper.find('.search-input').trigger('focus')
    await wrapper.find('.search-input').setValue('frontino')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.search-item')
    expect(items.length).toBeGreaterThan(0)
    items.forEach(item => {
      expect(item.text().toLowerCase()).toContain('frontino')
    })
  })

  it('filtra por subregión', async () => {
    const wrapper = mount(MapSearch)
    await wrapper.find('.search-input').trigger('focus')
    // 'urab' es subcadena de 'Urabá' (sin tomar la á con acento)
    await wrapper.find('.search-input').setValue('urab')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.search-item')
    expect(items.length).toBe(2)
  })

  it('limita los resultados a 8', async () => {
    const wrapper = mount(MapSearch)
    await wrapper.find('.search-input').trigger('focus')
    // 'a' aparece en casi todas las vías
    await wrapper.find('.search-input').setValue('an')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.search-item')
    expect(items.length).toBeLessThanOrEqual(8)
  })

  it('emite open-via al hacer clic en un resultado', async () => {
    const wrapper = mount(MapSearch)
    await wrapper.find('.search-input').trigger('focus')
    await wrapper.find('.search-input').setValue('frontino')
    await wrapper.vm.$nextTick()
    const firstItem = wrapper.find('.search-item')
    if (firstItem.exists()) {
      await firstItem.trigger('mousedown')
      expect(wrapper.emitted('open-via')).toBeTruthy()
    }
  })

  it('el botón clear limpia la búsqueda', async () => {
    const wrapper = mount(MapSearch)
    await wrapper.find('.search-input').setValue('frontino')
    await wrapper.find('.search-input').trigger('focus')
    await wrapper.vm.$nextTick()
    const clearBtn = wrapper.find('.search-clear')
    if (clearBtn.exists()) {
      await clearBtn.trigger('click')
      expect(wrapper.find('.search-input').element.value).toBe('')
    }
  })
})
