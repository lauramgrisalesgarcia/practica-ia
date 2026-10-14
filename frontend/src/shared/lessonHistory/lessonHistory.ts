import type { LessonSummary, LessonWithResult, MaterialStatus } from '@/domain/lesson'

export type MaterialFilter = 'all' | MaterialStatus

export interface HistorySummary {
  lessonCount: number
  totalMinutes: number
  lastLessonDate: string | null
  daysSinceLastLesson: number | null
  // Clases con material generado (pendiente o resuelto) y cuántas de ellas están resueltas
  withMaterial: number
  completedMaterial: number
  // Media de las notas del material resuelto, o null si no hay ninguno
  averageScore: number | null
}

export interface MonthGroup<T extends LessonSummary = LessonSummary> {
  key: string
  label: string
  lessons: T[]
}

const DAY_MS = 24 * 60 * 60 * 1000

// Días naturales entre dos instantes (según la fecha UTC de cada uno)
function calendarDaysBetween(from: Date, to: Date): number {
  const day = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.round((day(to) - day(from)) / DAY_MS)
}

// Las clases llegan de la más reciente a la más antigua
export function summarizeHistory(lessons: LessonWithResult[], today: Date): HistorySummary {
  const last = lessons[0]
  const scores = lessons.flatMap((lesson) => (lesson.score === null ? [] : [lesson.score]))
  return {
    lessonCount: lessons.length,
    totalMinutes: lessons.reduce((total, lesson) => total + lesson.durationMinutes, 0),
    lastLessonDate: last?.date ?? null,
    daysSinceLastLesson: last ? calendarDaysBetween(new Date(last.date), today) : null,
    withMaterial: lessons.filter((lesson) => lesson.materialStatus !== 'none').length,
    completedMaterial: lessons.filter((lesson) => lesson.materialStatus === 'completed').length,
    averageScore: scores.length ? scores.reduce((total, score) => total + score, 0) / scores.length : null,
  }
}

// Texto comparable sin mayúsculas, tildes ni espacios sobrantes
function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').trim()
}

export function filterLessons<T extends LessonSummary>(lessons: T[], filter: MaterialFilter, query: string): T[] {
  const search = normalize(query)
  return lessons.filter(
    (lesson) =>
      (filter === 'all' || lesson.materialStatus === filter) && (!search || normalize(lesson.topic).includes(search)),
  )
}

export function groupByMonth<T extends LessonSummary>(lessons: T[], timeZone?: string): MonthGroup<T>[] {
  const keyFormat = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone })
  const labelFormat = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric', timeZone })
  const groups: MonthGroup<T>[] = []
  for (const lesson of lessons) {
    const date = new Date(lesson.date)
    const key = keyFormat.format(date)
    const group = groups.at(-1)
    if (group?.key === key) {
      group.lessons.push(lesson)
    } else {
      const label = labelFormat.format(date)
      groups.push({ key, label: label.charAt(0).toLocaleUpperCase('es') + label.slice(1), lessons: [lesson] })
    }
  }
  return groups
}

const scoreFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 0 })

// Porcentaje de aciertos redondeado: «67 %»
export function formatScore(score: number): string {
  return `${scoreFormat.format(score)} %`
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function formatDaysAgo(days: number): string {
  if (days === 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days} días`
}
