import type { RecentActivity } from '@/domain/insights'
import { activityDescription } from './activityDescription'

const BASE: RecentActivity = {
  id: 'lesson-1',
  type: 'lesson',
  date: '2026-10-08T16:00:00Z',
  lessonId: '1',
  studentName: 'Emma Schmidt',
  topic: 'Pedir en un restaurante',
  score: null,
}

describe('activityDescription', () => {
  it('describe una clase realizada', () => {
    expect(activityDescription(BASE)).toBe('tuvo clase de «Pedir en un restaurante»')
  })

  it('describe un material nuevo', () => {
    expect(activityDescription({ ...BASE, type: 'material' })).toBe('tiene material nuevo de «Pedir en un restaurante»')
  })

  it('describe una entrega con su nota redondeada', () => {
    expect(activityDescription({ ...BASE, type: 'submission', score: 66.67 })).toBe(
      'resolvió «Pedir en un restaurante» con un 67 %',
    )
  })

  it('describe una entrega sin nota', () => {
    expect(activityDescription({ ...BASE, type: 'submission' })).toBe('resolvió «Pedir en un restaurante»')
  })
})
