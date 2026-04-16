import { describe, it, expect } from 'vitest'
import {
  groupViasFiltered,
  calcLongitudRows,
  calcMunicipiosRows,
  calcCircuitosRows,
  avanceBadge,
  avanceLabel,
} from '../utils/aggregations.js'

const VIAS = [
  { nombre: 'El Botón - Frontino',  municipio: 'FRONTINO',  subregion: 'Occidente', circuito: 'Frontino - Nutibara', contratista: 'CONSORCIO A', km: 10,  avance: 20 },
  { nombre: 'El Botón - Frontino',  municipio: 'FRONTINO',  subregion: 'Occidente', circuito: 'Frontino - Nutibara', contratista: 'CONSORCIO A', km: 5,   avance: 20 },
  { nombre: 'Guarne - Yolombal',    municipio: 'GUARNE',    subregion: 'Oriente',   circuito: 'Guarne - Yolombal',  contratista: 'CONSORCIO B', km: 12,  avance: 50 },
  { nombre: 'Mutata - Pavarando',   municipio: 'MUTATÁ',    subregion: 'Urabá',     circuito: 'Mutata - Pavarando', contratista: 'CONSORCIO C', km: 30,  avance: 0  },
]

// ─────────────────────────────────────────────────────────────────────────────
// groupViasFiltered
// ─────────────────────────────────────────────────────────────────────────────
describe('groupViasFiltered', () => {
  it('agrupa duplicados por nombre y suma km', () => {
    const result = groupViasFiltered(VIAS)
    const boton = result.find(v => v.nombre === 'El Botón - Frontino')
    expect(boton).toBeDefined()
    expect(boton.km).toBe(15)
  })

  it('devuelve array vacío si viasDetalle está vacío', () => {
    expect(groupViasFiltered([])).toEqual([])
  })

  it('filtra por búsqueda en nombre', () => {
    const result = groupViasFiltered(VIAS, 'guarne')
    expect(result.length).toBe(1)
    expect(result[0].nombre).toBe('Guarne - Yolombal')
  })

  it('filtra por búsqueda en municipio', () => {
    const result = groupViasFiltered(VIAS, 'mutatá')
    expect(result.length).toBe(1)
    expect(result[0].nombre).toBe('Mutata - Pavarando')
  })

  it('ordena por nombre ascendente por defecto', () => {
    const result = groupViasFiltered(VIAS)
    const nombres = result.map(v => v.nombre)
    expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b, 'es')))
  })

  it('ordena por km descendente cuando se pide', () => {
    const result = groupViasFiltered(VIAS, '', 'km', false)
    expect(result[0].km).toBeGreaterThanOrEqual(result[1].km)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calcLongitudRows
// ─────────────────────────────────────────────────────────────────────────────
describe('calcLongitudRows', () => {
  it('agrupa km por municipio y ordena de mayor a menor', () => {
    const result = calcLongitudRows(VIAS)
    expect(result[0].km).toBeGreaterThanOrEqual(result[1].km)
  })

  it('calcula pctReal de cada municipio sobre el total', () => {
    const result = calcLongitudRows(VIAS)
    const sumPct = result.reduce((s, r) => s + r.pctReal, 0)
    expect(sumPct).toBeGreaterThanOrEqual(99) // puede haber redondeo
    expect(sumPct).toBeLessThanOrEqual(101)
  })

  it('excluye municipios con km = 0', () => {
    const viasConCero = [...VIAS, { nombre: 'X', municipio: 'VACIO', subregion: 'Norte', km: 0 }]
    const result = calcLongitudRows(viasConCero)
    expect(result.find(r => r.name === 'VACIO')).toBeUndefined()
  })

  it('retorna array vacío si no hay vías', () => {
    expect(calcLongitudRows([])).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calcMunicipiosRows
// ─────────────────────────────────────────────────────────────────────────────
describe('calcMunicipiosRows', () => {
  it('cuenta correctamente las vías por municipio', () => {
    const result = calcMunicipiosRows(VIAS)
    const frontino = result.find(r => r.nombre === 'FRONTINO')
    expect(frontino.vias).toBe(2)
  })

  it('suma el km total por municipio', () => {
    const result = calcMunicipiosRows(VIAS)
    const frontino = result.find(r => r.nombre === 'FRONTINO')
    expect(frontino.km).toBe(15)
  })

  it('filtra por búsqueda en subregión', () => {
    const result = calcMunicipiosRows(VIAS, 'oriente')
    expect(result.length).toBe(1)
    expect(result[0].nombre).toBe('GUARNE')
  })

  it('retorna array vacío si no hay vías', () => {
    expect(calcMunicipiosRows([])).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calcCircuitosRows
// ─────────────────────────────────────────────────────────────────────────────
describe('calcCircuitosRows', () => {
  it('agrupa vías por circuito y cuenta tramos', () => {
    const result = calcCircuitosRows(VIAS)
    const circuito = result.find(r => r.circuito === 'Frontino - Nutibara')
    expect(circuito.tramos).toBe(2)
  })

  it('calcula el avance promedio del circuito', () => {
    const result = calcCircuitosRows(VIAS)
    const circuito = result.find(r => r.circuito === 'Frontino - Nutibara')
    // Ambos tramos tienen avance 20, promedio = 20
    expect(circuito.avance).toBe(20)
  })

  it('filtra por búsqueda en nombre de circuito', () => {
    const result = calcCircuitosRows(VIAS, 'guarne')
    expect(result.length).toBe(1)
    expect(result[0].circuito).toBe('Guarne - Yolombal')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// avanceBadge y avanceLabel
// ─────────────────────────────────────────────────────────────────────────────
describe('avanceBadge', () => {
  it('retorna badge--pending cuando pct es 0', () => {
    expect(avanceBadge(0)).toBe('badge--pending')
  })
  it('retorna badge--done cuando pct >= 100', () => {
    expect(avanceBadge(100)).toBe('badge--done')
    expect(avanceBadge(110)).toBe('badge--done')
  })
  it('retorna badge--active para valores intermedios', () => {
    expect(avanceBadge(50)).toBe('badge--active')
    expect(avanceBadge(1)).toBe('badge--active')
    expect(avanceBadge(99)).toBe('badge--active')
  })
})

describe('avanceLabel', () => {
  it('retorna "Sin iniciar" cuando pct es 0', () => {
    expect(avanceLabel(0)).toBe('Sin iniciar')
  })
  it('retorna "Finalizado" cuando pct >= 100', () => {
    expect(avanceLabel(100)).toBe('Finalizado')
    expect(avanceLabel(105)).toBe('Finalizado')
  })
  it('retorna "En obra" para valores intermedios', () => {
    expect(avanceLabel(45)).toBe('En obra')
    expect(avanceLabel(99)).toBe('En obra')
  })
})
