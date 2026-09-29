import { describe, it, expect } from 'vitest'
import { parseArea, findPredialRow, mergePredialRow } from '../../src/utils/predial.js'

const rows = [
  { Proyecto: 'Tamesis la Oculta', Matricula: '032-17880', Area_Afectar: '500.05' },
  { Proyecto: 'Tamesis la Oculta', Matricula: '032-17880', Area_Afectar: '25.66' },
  { Proyecto: 'Tamesis Tramo 2',   Matricula: '032-17880', Area_Afectar: null },
  { Proyecto: 'P.A.P San Antonio de Prado', Matricula: '001-507923', Propietario: 'LUIS', Oferta: null },
]

describe('parseArea', () => {
  it('convierte formatos numéricos no ambiguos', () => {
    expect(parseArea('188.05')).toBe(188.05)
    expect(parseArea('3509.55 M2')).toBe(3509.55)
  })
  it('devuelve null para formatos ambiguos o vacíos', () => {
    expect(parseArea('2,779.43 M2')).toBeNull()
    expect(parseArea('39,300,00 M2')).toBeNull()
    expect(parseArea(null)).toBeNull()
  })
})

describe('findPredialRow', () => {
  it('elige la faja con área más cercana dentro del mismo proyecto', () => {
    expect(findPredialRow(rows, '032-17880', 26.6, 'Tamesis la Oculta')).toBe(rows[1])
    expect(findPredialRow(rows, '032-17880', 502, 'Tamesis la Oculta')).toBe(rows[0])
  })
  it('prefiere el mismo proyecto ignorando el prefijo P.A.P', () => {
    expect(findPredialRow(rows, '032-17880', 0, 'Tamesis Tramo 2')).toBe(rows[2])
    expect(findPredialRow(rows, ' 001-507923 ', 0, 'San Antonio de Prado')).toBe(rows[3])
  })
  it('reconoce matrículas alternas entre paréntesis', () => {
    const alt = [{ Proyecto: 'Granada 0+900', Matricula: '018-32 ( 018-73794)' }]
    expect(findPredialRow(alt, '018-73794')).toBe(alt[0])
    expect(findPredialRow(alt, '018-32')).toBe(alt[0])
  })
  it('devuelve null sin matrícula o sin coincidencias', () => {
    expect(findPredialRow(rows, null)).toBeNull()
    expect(findPredialRow(rows, '999-1')).toBeNull()
    expect(findPredialRow(null, '032-17880')).toBeNull()
  })
})

describe('mergePredialRow', () => {
  it('no sobrescribe propiedades con valores vacíos', () => {
    const out = mergePredialRow({ Matricula: '001-507923', Oferta: 'X', Propietario: null }, rows[3])
    expect(out.Oferta).toBe('X')
    expect(out.Propietario).toBe('LUIS')
  })
  it('copia las propiedades si no hay fila', () => {
    expect(mergePredialRow({ a: 1 }, null)).toEqual({ a: 1 })
  })
})
