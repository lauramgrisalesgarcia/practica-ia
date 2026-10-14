import type { StudentActivity } from '@/domain/studentInsights'
import { studentActivityDescription } from './studentActivityDescription'

const BASE: StudentActivity = {
  id: 'lesson-1',
  type: 'lesson',
  date: '2026-10-08T16:00:00Z',
  lessonId: '1',
  topic: 'Pedir en un restaurante',
  score: null,
}

describe('studentActivityDescription', () => {
  it('describe una clase tomada', () => {
    expect(studentActivityDescription(BASE)).toBe('Tuviste clase de «Pedir en un restaurante»')
  })

  it('describe un refuerzo nuevo', () => {
    expect(studentActivityDescription({ ...BASE, type: 'material' })).toBe(
      'Tienes un refuerzo nuevo de «Pedir en un restaurante»',
    )
  })

  it('describe un refuerzo resuelto con su nota redondeada', () => {
    expect(studentActivityDescription({ ...BASE, type: 'submission', score: 66.67 })).toBe(
      'Resolviste «Pedir en un restaurante» con un 67 %',
    )
  })
})
