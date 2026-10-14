import type { LessonSummary, MaterialStatus } from '@/domain/lesson'
import {
  filterLessons,
  formatDaysAgo,
  formatDuration,
  groupByMonth,
  summarizeHistory,
} from './lessonHistory'

function lesson(id: string, date: string, materialStatus: MaterialStatus, topic = `Tema ${id}`, durationMinutes = 60): LessonSummary {
  return { id, date, durationMinutes, topic, context: `Contexto ${id}`, materialStatus }
}

const LESSONS: LessonSummary[] = [
  lesson('1', '2026-10-08T16:00:00Z', 'completed', 'Pedir en un restaurante'),
  lesson('2', '2026-10-06T15:00:00Z', 'pending', 'Hablar del fin de semana', 45),
  lesson('3', '2026-09-24T16:00:00Z', 'completed', 'Hablar del tiempo', 30),
  lesson('4', '2026-09-17T16:00:00Z', 'none', 'Presentarse'),
]

describe('summarizeHistory', () => {
  it('resume clases, tiempo, última clase y progreso del material', () => {
    expect(summarizeHistory(LESSONS, new Date('2026-10-13T09:00:00Z'))).toEqual({
      lessonCount: 4,
      totalMinutes: 195,
      lastLessonDate: '2026-10-08T16:00:00Z',
      daysSinceLastLesson: 5,
      withMaterial: 3,
      completedMaterial: 2,
    })
  })

  it('sin clases no hay última clase', () => {
    expect(summarizeHistory([], new Date('2026-10-13T09:00:00Z'))).toEqual({
      lessonCount: 0,
      totalMinutes: 0,
      lastLessonDate: null,
      daysSinceLastLesson: null,
      withMaterial: 0,
      completedMaterial: 0,
    })
  })
})

describe('filterLessons', () => {
  it('devuelve todas con el filtro «todas» y sin búsqueda', () => {
    expect(filterLessons(LESSONS, 'all', '')).toEqual(LESSONS)
  })

  it('filtra por estado del material', () => {
    expect(filterLessons(LESSONS, 'completed', '').map((l) => l.id)).toEqual(['1', '3'])
    expect(filterLessons(LESSONS, 'none', '').map((l) => l.id)).toEqual(['4'])
  })

  it('busca por tema sin distinguir mayúsculas ni tildes', () => {
    expect(filterLessons(LESSONS, 'all', '  HABLAR ').map((l) => l.id)).toEqual(['2', '3'])
    expect(filterLessons(LESSONS, 'all', 'presentárse').map((l) => l.id)).toEqual(['4'])
  })

  it('combina estado y búsqueda', () => {
    expect(filterLessons(LESSONS, 'pending', 'hablar').map((l) => l.id)).toEqual(['2'])
  })
})

describe('groupByMonth', () => {
  it('agrupa por mes conservando el orden de las clases', () => {
    const groups = groupByMonth(LESSONS, 'UTC')

    expect(groups.map((g) => [g.label, g.lessons.map((l) => l.id)])).toEqual([
      ['Octubre de 2026', ['1', '2']],
      ['Septiembre de 2026', ['3', '4']],
    ])
  })
})

describe('formatDuration', () => {
  it.each([
    [45, '45 min'],
    [60, '1 h'],
    [90, '1 h 30 min'],
    [600, '10 h'],
    [0, '0 min'],
  ])('%i minutos -> %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })
})

describe('formatDaysAgo', () => {
  it.each([
    [0, 'hoy'],
    [1, 'ayer'],
    [5, 'hace 5 días'],
  ])('%i -> %s', (days, expected) => {
    expect(formatDaysAgo(days)).toBe(expected)
  })
})
