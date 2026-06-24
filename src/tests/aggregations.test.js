import { describe, it, expect } from 'vitest'
import {
  calcViasAgrupadas,
  calcLongitudAgrupada,
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
// calcViasAgrupadas
// ─────────────────────────────────────────────────────────────────────────────
describe('calcViasAgrupadas', () => {
  it('agrupa vías por circuito y suma km correctamente', () => {
    const result = calcViasAgrupadas(VIAS)
    expect(result.length).toBe(3) // 3 circuitos únicos
    const frontino = result.find(c => c.circuito === 'Frontino - Nutibara')
    expect(frontino).toBeDefined()
    expect(frontino.km).toBe(15) // 10 + 5
    expect(frontino.vias.length).toBe(1) // 'El Botón - Frontino' deduplicado
  })

  it('devuelve array vacío si viasDetalle está vacío', () => {
    expect(calcViasAgrupadas([])).toEqual([])
  })

  it('filtra por nombre de circuito', () => {
    const result = calcViasAgrupadas(VIAS, 'guarne')
    expect(result.length).toBe(1)
    expect(result[0].circuito).toBe('Guarne - Yolombal')
  })

  it('filtra por nombre de vía dentro del circuito', () => {
    const result = calcViasAgrupadas(VIAS, 'pavarando')
    expect(result.length).toBe(1)
    expect(result[0].circuito).toBe('Mutata - Pavarando')
  })

  it('ordena por circuito ascendente por defecto', () => {
    const result = calcViasAgrupadas(VIAS)
    const circuitos = result.map(c => c.circuito)
    expect(circuitos).toEqual([...circuitos].sort((a, b) => a.localeCompare(b, 'es')))
  })

  it('ordena por km descendente cuando se pide', () => {
    const result = calcViasAgrupadas(VIAS, '', 'km', false)
    expect(result[0].km).toBeGreaterThanOrEqual(result[1].km)
  })

  it('separa circuitos en diferentes subregiones', () => {
    const viasConDuplicado = [
      ...VIAS,
      { nombre: 'Tramo Extra Oriente', municipio: 'GUARNE', subregion: 'Oriente', circuito: 'Frontino - Nutibara', contratista: 'CONSORCIO A', km: 8, avance: 40 }
    ]
    const result = calcViasAgrupadas(viasConDuplicado)
    const occidenteResult = result.find(r => r.circuito === 'Frontino - Nutibara' && r.subregion === 'Occidente')
    const orienteResult = result.find(r => r.circuito === 'Frontino - Nutibara' && r.subregion === 'Oriente')

    expect(occidenteResult).toBeDefined()
    expect(occidenteResult.km).toBe(15)

    expect(orienteResult).toBeDefined()
    expect(orienteResult.km).toBe(8)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calcLongitudAgrupada
// ─────────────────────────────────────────────────────────────────────────────
describe('calcLongitudAgrupada', () => {
  it('agrupa km por municipio y ordena de mayor a menor', () => {
    const result = calcLongitudAgrupada(VIAS)
    expect(result[0].km).toBeGreaterThanOrEqual(result[1].km)
  })

  it('calcula pctReal de cada municipio sobre el total', () => {
    const result = calcLongitudAgrupada(VIAS)
    const sumPct = result.reduce((s, r) => s + r.pctReal, 0)
    expect(sumPct).toBeGreaterThanOrEqual(99)
    expect(sumPct).toBeLessThanOrEqual(101)
  })

  it('excluye municipios con km = 0', () => {
    const viasConCero = [...VIAS, { nombre: 'X', municipio: 'VACIO', subregion: 'Norte', km: 0 }]
    const result = calcLongitudAgrupada(viasConCero)
    expect(result.find(r => r.municipio === 'VACIO')).toBeUndefined()
  })

  it('retorna array vacío si no hay vías', () => {
    expect(calcLongitudAgrupada([])).toEqual([])
  })

  it('incluye vías anidadas por municipio', () => {
    const result = calcLongitudAgrupada(VIAS)
    const frontino = result.find(r => r.municipio === 'FRONTINO')
    expect(frontino.vias.length).toBeGreaterThan(0)
    expect(frontino.vias[0]).toHaveProperty('circuito')
    expect(frontino.vias[0]).toHaveProperty('nombre')
  })

  it('filtra por nombre de circuito', () => {
    const result = calcLongitudAgrupada(VIAS, 'guarne')
    expect(result.length).toBe(1)
    expect(result[0].municipio).toBe('GUARNE')
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

  it('separa circuitos homónimos en diferentes subregiones', () => {
    const viasConDuplicado = [
      ...VIAS,
      { nombre: 'Tramo Extra Oriente', municipio: 'GUARNE', subregion: 'Oriente', circuito: 'Frontino - Nutibara', contratista: 'CONSORCIO A', km: 8, avance: 40 }
    ]
    const result = calcCircuitosRows(viasConDuplicado)
    const occidenteResult = result.find(r => r.circuito === 'Frontino - Nutibara' && r.subregion === 'Occidente')
    const orienteResult = result.find(r => r.circuito === 'Frontino - Nutibara' && r.subregion === 'Oriente')

    expect(occidenteResult).toBeDefined()
    expect(occidenteResult.tramos).toBe(2)
    expect(occidenteResult.km).toBe(15)

    expect(orienteResult).toBeDefined()
    expect(orienteResult.tramos).toBe(1)
    expect(orienteResult.km).toBe(8)
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
