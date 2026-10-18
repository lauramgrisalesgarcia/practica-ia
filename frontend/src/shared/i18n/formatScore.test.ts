import { formatScore } from '@/shared/i18n/formatScore'

describe('formatScore', () => {
  it('muestra el porcentaje redondeado con el formato español', () => {
    expect(formatScore(66.67)).toBe('67 %')
    expect(formatScore(100)).toBe('100 %')
  })
})
