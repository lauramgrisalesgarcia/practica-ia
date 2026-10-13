import { formatDate } from './formatDate'

describe('formatDate', () => {
  it('formatea una fecha ISO en español con el mes en letras', () => {
    expect(formatDate('2026-10-08T16:00:00Z')).toBe('8 de octubre de 2026')
  })
})
