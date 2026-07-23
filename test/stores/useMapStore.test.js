import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../../src/stores/useMapStore.js'

function initStore(filter = {}, vias = VIAS) {
  const store = useMapStore()
  store.setMapStats({ viasIntervenidas: 0, longitudTotal: 0, municipios: 0, circuitos: 0, subregiones: [], viasDetalle: vias })
  store.setFilter({ search: '', subregion: 'Todas las subregiones', municipio: 'Todos los municipios', circuito: 'Todos los circuitos', ...filter })
  return store
}

const VIAS = [
  { nombre: 'El Botón - Frontino', municipio: 'FRONTINO', subregion: 'Occidente', circuito: 'Frontino - Nutibara', km: 10 },
  { nombre: 'Guarne - Yolombal',   municipio: 'GUARNE',    subregion: 'Oriente',   circuito: 'Guarne - Yolombal',  km: 12 },
  { nombre: 'Mutata - Pavarando',  municipio: 'MUTATÁ',    subregion: 'Urabá',     circuito: 'Mutata - Pavarando', km: 30 },
]

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useMapStore — estado inicial', () => {
  it('tiene los filtros por defecto', () => {
    const store = useMapStore()
    expect(store.activeFilters).toEqual({
      search: '',
      subregion: 'Todas las subregiones',
      municipio: 'Todos los municipios',
      circuito: 'Todos los circuitos',
    })
  })

  it('mapLoading inicia en true', () => {
    const store = useMapStore()
    expect(store.mapLoading).toBe(true)
  })
})

describe('useMapStore — setMapLoading', () => {
  it('actualiza mapLoading', () => {
    const store = useMapStore()
    store.setMapLoading(false)
    expect(store.mapLoading).toBe(false)
  })
})

describe('useMapStore — setFilterOptions / setMapStats', () => {
  it('reemplaza filterOptions', () => {
    const store = useMapStore()
    const options = { subregiones: ['Todas', 'Norte'], municipios: ['Todos'], circuitos: ['Todos'], municipiosPorSubregion: {} }
    store.setFilterOptions(options)
    expect(store.filterOptions).toEqual(options)
  })

  it('reemplaza mapStats', () => {
    const store = useMapStore()
    const stats = { viasIntervenidas: 5, longitudTotal: 100, municipios: 2, circuitos: 3, subregiones: [], viasDetalle: VIAS }
    store.setMapStats(stats)
    expect(store.mapStats).toEqual(stats)
  })
})

describe('useMapStore — filteredMunicipioOptions', () => {
  it('devuelve todos los municipios cuando la subregión es "Todas las subregiones"', () => {
    const store = useMapStore()
    store.setFilterOptions({
      subregiones: ['Todas las subregiones'],
      municipios: ['Todos los municipios', 'Frontino', 'Guarne'],
      circuitos: ['Todos los circuitos'],
      municipiosPorSubregion: {},
    })
    expect(store.filteredMunicipioOptions).toEqual(['Todos los municipios', 'Frontino', 'Guarne'])
  })

  it('filtra municipios según la subregión activa', () => {
    const store = useMapStore()
    store.setFilterOptions({
      subregiones: ['Todas las subregiones', 'Occidente'],
      municipios: ['Todos los municipios', 'Frontino', 'Guarne'],
      circuitos: ['Todos los circuitos'],
      municipiosPorSubregion: { Occidente: ['Frontino'] },
    })
    store.setFilter({ search: '', subregion: 'Occidente', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    expect(store.filteredMunicipioOptions).toEqual(['Todos los municipios', 'Frontino'])
  })

  it('devuelve solo "Todos los municipios" si la subregión activa no tiene entrada en municipiosPorSubregion', () => {
    const store = useMapStore()
    store.setFilterOptions({
      subregiones: ['Todas las subregiones', 'Nordeste'],
      municipios: ['Todos los municipios', 'Frontino'],
      circuitos: ['Todos los circuitos'],
      municipiosPorSubregion: {},
    })
    store.setFilter({ search: '', subregion: 'Nordeste', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    expect(store.filteredMunicipioOptions).toEqual(['Todos los municipios'])
  })
})

describe('useMapStore — filteredCircuitoOptions', () => {
  beforeEach(() => {
    // se re-crea pinia en el beforeEach externo; nada que hacer aquí
  })

  it('devuelve todos los circuitos si no hay subregión ni municipio activos', () => {
    const store = useMapStore()
    store.setFilterOptions({
      subregiones: ['Todas las subregiones'],
      municipios: ['Todos los municipios'],
      circuitos: ['Todos los circuitos', 'A', 'B'],
      municipiosPorSubregion: {},
    })
    expect(store.filteredCircuitoOptions).toEqual(['Todos los circuitos', 'A', 'B'])
  })

  it('filtra circuitos según subregión activa usando viasDetalle', () => {
    const store = initStore({ subregion: 'Occidente' })
    expect(store.filteredCircuitoOptions).toEqual(['Todos los circuitos', 'Frontino - Nutibara'])
  })

  it('filtra circuitos según municipio activo usando viasDetalle', () => {
    const store = initStore({ municipio: 'GUARNE' })
    expect(store.filteredCircuitoOptions).toEqual(['Todos los circuitos', 'Guarne - Yolombal'])
  })
})

describe('useMapStore — filteredStats', () => {
  beforeEach(() => {
    // aplicado en cada test mediante setMapStats
  })

  it('devuelve mapStats sin cambios si no hay filtros activos', () => {
    const store = useMapStore()
    const stats = { viasIntervenidas: 3, longitudTotal: 52, municipios: 3, circuitos: 3, subregiones: [], viasDetalle: VIAS }
    store.setMapStats(stats)
    expect(store.filteredStats).toEqual(stats)
  })

  it('filtra por subregión activa y recalcula totales', () => {
    const store = initStore({ subregion: 'Occidente' })
    const result = store.filteredStats
    expect(result.viasIntervenidas).toBe(1)
    expect(result.longitudTotal).toBe(10)
    expect(result.viasDetalle.length).toBe(1)
  })

  it('filtra por texto de búsqueda (case/acento-insensible)', () => {
    const store = initStore({ search: 'mutata' })
    const result = store.filteredStats
    expect(result.viasDetalle.length).toBe(1)
    expect(result.viasDetalle[0].municipio).toBe('MUTATÁ')
  })

  it('filtra combinando municipio y circuito', () => {
    const store = initStore({ municipio: 'GUARNE', circuito: 'Guarne - Yolombal' })
    const result = store.filteredStats
    expect(result.viasDetalle.length).toBe(1)
  })

  it('excluye vías del mismo municipio que no coinciden con el circuito activo', () => {
    const viasMismoMunicipio = [
      ...VIAS,
      { nombre: 'Guarne - Otro tramo', municipio: 'GUARNE', subregion: 'Oriente', circuito: 'Guarne - Otro circuito', km: 5 },
    ]
    const store = initStore({ municipio: 'GUARNE' }, viasMismoMunicipio)
    // Dos llamadas: la primera fija el municipio (resetea circuito por el cascadeo de setFilter),
    // la segunda cambia solo el circuito para que no se vuelva a resetear.
    store.setFilter({ search: '', subregion: 'Todas las subregiones', municipio: 'GUARNE', circuito: 'Guarne - Yolombal' })
    const result = store.filteredStats
    expect(result.viasDetalle.length).toBe(1)
    expect(result.viasDetalle[0].circuito).toBe('Guarne - Yolombal')
  })

  it('maneja vías sin subregión al buscar por texto (nombre y municipio no matchean, cae a norm(subregion))', () => {
    const viasSinSubregion = [
      ...VIAS,
      { nombre: 'Tramo genérico', municipio: 'OTRO', subregion: undefined, circuito: 'X', km: 8 },
    ]
    const store = initStore({ search: 'mutata' }, viasSinSubregion)
    const result = store.filteredStats
    // Solo matchea la vía de Mutatá; la vía sin subregión no matchea ningún campo y queda excluida.
    expect(result.viasDetalle.length).toBe(1)
    expect(result.viasDetalle[0].municipio).toBe('MUTATÁ')
  })

  it('omite del acumulado por subregión las vías sin campo subregion', () => {
    const viasSinSubregion = [
      ...VIAS,
      { nombre: 'Tramo sin subregion', municipio: 'OTRO', subregion: undefined, circuito: 'X', km: 8 },
    ]
    const store = initStore({ municipio: 'OTRO' }, viasSinSubregion)
    const result = store.filteredStats
    expect(result.viasDetalle.length).toBe(1)
    expect(result.longitudTotal).toBe(8)
  })

  it('no rompe si longitudTotal es 0 (evita división por cero)', () => {
    const store = useMapStore()
    store.setMapStats({ viasIntervenidas: 0, longitudTotal: 0, municipios: 0, circuitos: 0, subregiones: [], viasDetalle: [{ nombre: 'X', municipio: 'X', subregion: 'Norte', circuito: 'X', km: 0 }] })
    store.setFilter({ search: '', subregion: 'Norte', municipio: 'Todos los municipios', circuito: 'Todos los circuitos' })
    expect(store.filteredStats.longitudTotal).toBe(0)
  })
})

describe('useMapStore — setFilter (reseteo en cascada)', () => {
  it('resetea municipio y circuito cuando cambia la subregión', () => {
    const store = useMapStore()
    store.setFilter({ search: '', subregion: 'Occidente', municipio: 'Frontino', circuito: 'Frontino - Nutibara' })
    const filters = { search: '', subregion: 'Oriente', municipio: 'Frontino', circuito: 'Frontino - Nutibara' }
    store.setFilter(filters)
    expect(store.activeFilters.municipio).toBe('Todos los municipios')
    expect(store.activeFilters.circuito).toBe('Todos los circuitos')
  })

  it('resetea solo circuito cuando cambia el municipio (misma subregión)', () => {
    const store = useMapStore()
    store.setFilter({ search: '', subregion: 'Occidente', municipio: 'Frontino', circuito: 'Frontino - Nutibara' })
    const filters = { search: '', subregion: 'Occidente', municipio: 'Otro Municipio', circuito: 'Frontino - Nutibara' }
    store.setFilter(filters)
    expect(store.activeFilters.municipio).toBe('Otro Municipio')
    expect(store.activeFilters.circuito).toBe('Todos los circuitos')
  })

  it('no resetea nada si solo cambia el circuito', () => {
    const store = useMapStore()
    // Primera llamada: fija subregion y municipio como línea base (ambos cambian, se resetea circuito)
    store.setFilter({ search: '', subregion: 'Occidente', municipio: 'Frontino', circuito: 'Todos los circuitos' })
    expect(store.activeFilters.municipio).toBe('Todos los municipios')
    // Segunda llamada: mismos subregion/municipio que el estado actual, solo cambia circuito
    const filters = { search: '', subregion: 'Occidente', municipio: 'Todos los municipios', circuito: 'Frontino - Nutibara' }
    store.setFilter(filters)
    expect(store.activeFilters.circuito).toBe('Frontino - Nutibara')
  })
})
