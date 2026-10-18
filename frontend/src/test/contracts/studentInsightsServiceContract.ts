import type { StudentInsights } from '@/domain/studentInsights'
import type { StudentInsightsService } from '@/features/student/services/studentInsightsService'

const RESTAURANT_TOPIC = 'Pedir en un restaurante'

const RESTAURANT_ID = 'c4a9e2d7-5f1b-4c8e-a3d6-7b2e9f0c1d45'
const INTRODUCTIONS_ID = '1e7d3b5a-8c2f-4a6e-9d0b-3f5a7c9e1b28'

// Indicadores de ejemplo, coherentes con los ejemplos de docs/openapi.yaml
export const STUDENT_INSIGHTS: StudentInsights = {
  lessonsCount: 2,
  completedMaterials: 1,
  averageScore: 66.67,
  pendingMaterials: [{ lessonId: INTRODUCTIONS_ID, topic: 'Presentarse', date: '2026-10-01T16:00:00Z', exerciseCount: 5 }],
  recentActivity: [
    {
      id: `submission-${RESTAURANT_ID}`,
      type: 'submission',
      date: '2026-10-12T18:05:00Z',
      lessonId: RESTAURANT_ID,
      topic: RESTAURANT_TOPIC,
      score: 66.67,
    },
    {
      id: `lesson-${RESTAURANT_ID}`,
      type: 'lesson',
      date: '2026-10-08T16:00:00Z',
      lessonId: RESTAURANT_ID,
      topic: RESTAURANT_TOPIC,
      score: null,
    },
  ],
  calendar: [
    { id: INTRODUCTIONS_ID, start: '2026-10-01T16:00:00Z', topic: 'Presentarse' },
    { id: RESTAURANT_ID, start: '2026-10-08T16:00:00Z', topic: RESTAURANT_TOPIC },
  ],
  scoreHistory: [
    { lessonId: RESTAURANT_ID, topic: RESTAURANT_TOPIC, submittedAt: '2026-10-12T18:05:00Z', score: 66.67 },
  ],
}

// Comportamiento que toda implementación de StudentInsightsService debe cumplir
export function describeStudentInsightsServiceContract(createService: (insights: StudentInsights) => StudentInsightsService) {
  describe('contrato de StudentInsightsService', () => {
    it('devuelve los indicadores del estudiante', async () => {
      await expect(createService(STUDENT_INSIGHTS).getInsights()).resolves.toEqual(STUDENT_INSIGHTS)
    })

    it('devuelve indicadores vacíos si el estudiante aún no tiene clases', async () => {
      const empty: StudentInsights = {
        lessonsCount: 0,
        completedMaterials: 0,
        averageScore: null,
        pendingMaterials: [],
        recentActivity: [],
        calendar: [],
        scoreHistory: [],
      }

      await expect(createService(empty).getInsights()).resolves.toEqual(empty)
    })
  })
}
