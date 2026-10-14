import type { Student } from '@/domain/student'
import { countByLanguage, countByLevel, initials } from './studentStats'

function student(level: Student['level'], nativeLanguage: string): Student {
  return { id: `${level}-${nativeLanguage}`, name: 'X', email: 'x@colegio.edu', level, nativeLanguage }
}

describe('countByLevel', () => {
  it('cuenta los alumnos de cada nivel en el orden del MCER, sin niveles vacíos', () => {
    expect(countByLevel([student('C1', 'en'), student('A2', 'de'), student('C1', 'fr')])).toEqual([
      { level: 'A2', count: 1 },
      { level: 'C1', count: 2 },
    ])
  })

  it('no devuelve nada sin alumnos', () => {
    expect(countByLevel([])).toEqual([])
  })
})

describe('countByLanguage', () => {
  it('cuenta los alumnos por idioma natal, de más a menos y por nombre si empatan', () => {
    expect(countByLanguage([student('A1', 'fr'), student('A1', 'de'), student('B1', 'fr'), student('B2', 'en')])).toEqual([
      { language: 'francés', count: 2 },
      { language: 'alemán', count: 1 },
      { language: 'inglés', count: 1 },
    ])
  })
})

describe('initials', () => {
  it.each([
    ['Ana Gómez', 'AG'],
    ['Sofía Ramírez Torres', 'SR'],
    ['Emma', 'E'],
    ['  luis   pérez ', 'LP'],
  ])('%j -> %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})
