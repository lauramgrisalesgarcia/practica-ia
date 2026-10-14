import type { TeacherInsights } from '@/domain/insights'
import { wait } from '@/dev/wait'
import type { TeacherInsightsService } from './teacherInsightsService'

// Datos de ejemplo fijos: el back aún no ofrece estos indicadores.
// Cuando exista el endpoint, se sustituye por una implementación HTTP en composition.ts.
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
      id: 'a1',
      type: 'submission',
      date: '2026-10-12T18:05:00Z',
      studentName: 'Emma Schmidt',
      description: 'resolvió «En el restaurante» con un 67 %',
    },
    {
      id: 'a2',
      type: 'material',
      date: '2026-10-12T10:30:00Z',
      studentName: 'John Miller',
      description: 'tiene material nuevo de «Hablar del tiempo»',
    },
    {
      id: 'a3',
      type: 'lesson',
      date: '2026-10-11T16:00:00Z',
      studentName: 'Emma Schmidt',
      description: 'tuvo clase de «Pedir en un restaurante»',
    },
    {
      id: 'a4',
      type: 'submission',
      date: '2026-10-10T19:20:00Z',
      studentName: 'John Miller',
      description: 'resolvió «Mi fin de semana» con un 100 %',
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
