import { describe, it, expect } from 'vitest'
import { shortLabel, mesesTranscurridos, calcAvanceKm } from '../../src/utils/stats.js'

// ─────────────────────────────────────────────────────────────────────────────
// shortLabel
// ─────────────────────────────────────────────────────────────────────────────
describe('shortLabel', () => {
  it('abrevia "Valle de Aburra" a "Valle"', () => {
    expect(shortLabel('Valle de Aburra')).toBe('Valle')
  })

  it('abrevia con tildes: "Urabá" a "Urabá"', () => {
    expect(shortLabel('Urabá')).toBe('Urabá')
  })

  it('abrevia "Magdalena Medio" a "Magd. M."', () => {
    expect(shortLabel('Magdalena Medio')).toBe('Magd. M.')
  })

  it('devuelve el nombre original si no existe en el mapa', () => {
    expect(shortLabel('Subregión Desconocida')).toBe('Subregión Desconocida')
  })

  it('es insensible a mayúsculas/minúsculas', () => {
    expect(shortLabel('ORIENTE')).toBe('Oriente')
    expect(shortLabel('oriente')).toBe('Oriente')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// mesesTranscurridos
// ─────────────────────────────────────────────────────────────────────────────
describe('mesesTranscurridos', () => {
  it('devuelve 3 meses para un contrato conocido con fecha 2026-01-01 y hoy 2026-04-01', () => {
    const hoy = new Date('2026-04-01')
    expect(mesesTranscurridos('25OO111B2821', hoy)).toBe(3)
  })

  it('devuelve 0 meses si hoy es exactamente la fecha de inicio', () => {
    const hoy = new Date('2026-01-01')
    expect(mesesTranscurridos('25OO111B2821', hoy)).toBe(0)
  })

  it('usa la fecha por defecto para un contrato desconocido', () => {
    const hoy = new Date('2026-06-01')
    expect(mesesTranscurridos('CONTRATO_INEXISTENTE', hoy)).toBe(5)
  })

  it('devuelve un número no negativo para contratos activos', () => {
    const resultado = mesesTranscurridos('4600018883', new Date())
    expect(resultado).toBeGreaterThanOrEqual(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// calcAvanceKm
// ─────────────────────────────────────────────────────────────────────────────
describe('calcAvanceKm', () => {
  it('retorna ceros cuando el array está vacío', () => {
    expect(calcAvanceKm([])).toEqual({ pct: 0, intervenidos: 0, contractuales: 0, pendientes: 0 })
  })

  it('calcula correctamente con una sola vía al 50%', () => {
    const vias = [{ km: 10, estabilizado: 5 }]
    const result = calcAvanceKm(vias)
    expect(result.pct).toBe(50)
    expect(result.contractuales).toBe(10)
    expect(result.intervenidos).toBe(5)
    expect(result.pendientes).toBe(5)
  })

  it('calcula el promedio de avance entre varias vías', () => {
    const vias = [
      { km: 20, estabilizado: 20 },
      { km: 20, estabilizado: 0 },
    ]
    const result = calcAvanceKm(vias)
    expect(result.pct).toBe(50)
    expect(result.contractuales).toBe(40)
    expect(result.intervenidos).toBe(20)
    expect(result.pendientes).toBe(20)
  })

  it('maneja vías sin propiedad km (la trata como 0)', () => {
    const vias = [{ estabilizado: 5 }, { km: 10, estabilizado: 0 }]
    const result = calcAvanceKm(vias)
    expect(result.contractuales).toBe(10)
    expect(result.pct).toBe(50)
  })

  it('redondea a 2 decimales', () => {
    const vias = [{ km: 3, estabilizado: 0.99 }]
    const result = calcAvanceKm(vias)
    expect(result.intervenidos).toBe(0.99)
    expect(result.pendientes).toBe(2.01)
  })
})
