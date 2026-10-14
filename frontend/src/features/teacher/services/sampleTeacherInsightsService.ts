import type { TeacherInsights } from '@/domain/insights'
import { wait } from '@/dev/wait'
import type { TeacherInsightsService } from './teacherInsightsService'

// Datos de ejemplo fijos para desarrollar sin back (con back se usa httpTeacherInsightsService)
const SAMPLE_INSIGHTS: TeacherInsights = {
  isSample: true,
  lessonsThisMonth: 14,
  pendingMaterials: 4,
  materialStatus: { completed: 9, pending: 4, none: 3 },
  weeklyLessons: [
    { weekStart: '2026-08-24', count: 3 },
    { weekStart: '2026-08-31', count: 5 },
    { weekStart: '2026-09-07', count: 4 },
    { weekStart: '2026-09-14', count: 6 },
    { weekStart: '2026-09-21', count: 5 },
    { weekStart: '2026-09-28', count: 7 },
    { weekStart: '2026-10-05', count: 4 },
    { weekStart: '2026-10-12', count: 3 },
  ],
  recentActivity: [
    {
      id: 'submission-c3',
      type: 'submission',
      date: '2026-10-12T18:05:00Z',
      lessonId: 'c3',
      studentName: 'Emma Schmidt',
      topic: 'Pedir en un restaurante',
      score: 66.67,
    },
    {
      id: 'material-c4',
      type: 'material',
      date: '2026-10-12T10:30:00Z',
      lessonId: 'c4',
      studentName: 'John Miller',
      topic: 'Hablar del tiempo',
      score: null,
    },
    {
      id: 'lesson-c3',
      type: 'lesson',
      date: '2026-10-08T16:00:00Z',
      lessonId: 'c3',
      studentName: 'Emma Schmidt',
      topic: 'Pedir en un restaurante',
      score: null,
    },
    {
      id: 'submission-c2',
      type: 'submission',
      date: '2026-10-07T19:20:00Z',
      lessonId: 'c2',
      studentName: 'John Miller',
      topic: 'Hablar del fin de semana',
      score: 100,
    },
  ],
  calendar: [
    { id: 'c1', start: '2026-10-01T16:00:00Z', studentName: 'Emma Schmidt', topic: 'Presentarse' },
    { id: 'c2', start: '2026-10-06T15:00:00Z', studentName: 'John Miller', topic: 'Hablar del fin de semana' },
    { id: 'c3', start: '2026-10-08T16:00:00Z', studentName: 'Emma Schmidt', topic: 'Pedir en un restaurante' },
    { id: 'c4', start: '2026-10-13T15:00:00Z', studentName: 'John Miller', topic: 'Hablar del tiempo' },
    { id: 'c5', start: '2026-10-13T17:00:00Z', studentName: 'Emma Schmidt', topic: 'Ir de compras' },
    { id: 'c6', start: '2026-10-15T16:00:00Z', studentName: 'Emma Schmidt', topic: 'En el médico' },
    { id: 'c7', start: '2026-10-20T15:00:00Z', studentName: 'John Miller', topic: 'Planes para el viaje' },
    { id: 'c8', start: '2026-10-22T16:00:00Z', studentName: 'Emma Schmidt', topic: 'Pedir direcciones' },
    { id: 'c9', start: '2026-10-27T15:00:00Z', studentName: 'John Miller', topic: 'Contar una anécdota' },
    { id: 'c10', start: '2026-10-29T16:00:00Z', studentName: 'Emma Schmidt', topic: 'Reservar un hotel' },
  ],
}

export function createSampleTeacherInsightsService({ delayMs = 500 }: { delayMs?: number } = {}): TeacherInsightsService {
  return {
    async getInsights() {
      await wait(delayMs)
      return SAMPLE_INSIGHTS
    },
  }
}
