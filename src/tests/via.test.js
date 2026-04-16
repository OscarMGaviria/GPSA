import { describe, it, expect } from 'vitest'
import { parseAvancePct, getBarColor, getStatusLabel, getStatusClass } from '../utils/via.js'

// ─────────────────────────────────────────────────────────────────────────────
// parseAvancePct
// ─────────────────────────────────────────────────────────────────────────────
describe('parseAvancePct', () => {
  it('parsea número entero como string', () => {
    expect(parseAvancePct({ Avance: '50' })).toBe(50)
  })

  it('parsea número con símbolo de %', () => {
    expect(parseAvancePct({ Avance: '75%' })).toBe(75)
  })

  it('parsea número con coma decimal (formato colombiano)', () => {
    expect(parseAvancePct({ Avance: '33,5' })).toBe(33.5)
  })

  it('retorna 0 si el campo está vacío', () => {
    expect(parseAvancePct({ Avance: '' })).toBe(0)
  })

  it('retorna 0 si el objeto description está vacío', () => {
    expect(parseAvancePct({})).toBe(0)
  })

  it('clampea valores mayores a 100 → 100', () => {
    expect(parseAvancePct({ Avance: '150' })).toBe(100)
  })

  it('clampea valores negativos → 0', () => {
    expect(parseAvancePct({ Avance: '-10' })).toBe(0)
  })

  it('también lee la clave en minúscula "avance"', () => {
    expect(parseAvancePct({ avance: '60' })).toBe(60)
  })

  it('prioriza "Avance" sobre "avance"', () => {
    expect(parseAvancePct({ Avance: '80', avance: '10' })).toBe(80)
  })

  it('parsea número como tipo number directamente', () => {
    expect(parseAvancePct({ Avance: 45 })).toBe(45)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getBarColor
// ─────────────────────────────────────────────────────────────────────────────
describe('getBarColor', () => {
  it('gris cuando pct es 0 (sin iniciar)', () => {
    expect(getBarColor(0)).toBe('#9ca3af')
  })
  it('verde vivo cuando pct es 100 (finalizado)', () => {
    expect(getBarColor(100)).toBe('#16a34a')
  })
  it('verde oscuro para valores intermedios (en obra)', () => {
    expect(getBarColor(50)).toBe('#0b5640')
    expect(getBarColor(1)).toBe('#0b5640')
    expect(getBarColor(99)).toBe('#0b5640')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getStatusLabel
// ─────────────────────────────────────────────────────────────────────────────
describe('getStatusLabel', () => {
  it('retorna "Sin iniciar" cuando pct es 0', () => {
    expect(getStatusLabel(0)).toBe('Sin iniciar')
  })
  it('retorna "Finalizado" cuando pct es 100', () => {
    expect(getStatusLabel(100)).toBe('Finalizado')
  })
  it('retorna "En obra" para valores intermedios', () => {
    expect(getStatusLabel(50)).toBe('En obra')
    expect(getStatusLabel(99)).toBe('En obra')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getStatusClass
// ─────────────────────────────────────────────────────────────────────────────
describe('getStatusClass', () => {
  it('retorna "pill--pending" cuando pct es 0', () => {
    expect(getStatusClass(0)).toBe('pill--pending')
  })
  it('retorna "pill--done" cuando pct es 100', () => {
    expect(getStatusClass(100)).toBe('pill--done')
  })
  it('retorna "pill--active" para valores intermedios', () => {
    expect(getStatusClass(50)).toBe('pill--active')
  })
})
