import { averageScore, MAX_SCORE, scorePercentage } from './businessRules'

describe('scorePercentage', () => {
  it('es el porcentaje de aciertos con 2 decimales, como el back', () => {
    expect(scorePercentage(2, 3)).toBe(66.67)
    expect(scorePercentage(1, 3)).toBe(33.33)
  })

  it('va de 0 a la nota máxima', () => {
    expect(scorePercentage(0, 4)).toBe(0)
    expect(scorePercentage(4, 4)).toBe(MAX_SCORE)
  })
})

describe('averageScore', () => {
  it('es la media de las notas con 2 decimales', () => {
    expect(averageScore([100, 66.67, 50])).toBe(72.22)
  })

  it('no hay media sin notas', () => {
    expect(averageScore([])).toBeNull()
  })
})
