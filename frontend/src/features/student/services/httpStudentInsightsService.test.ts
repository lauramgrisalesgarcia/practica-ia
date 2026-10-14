import type { StudentInsights } from '@/domain/studentInsights'
import { ApiError } from '@/shared/http/errors'
import { createHttpClient } from '@/shared/http/httpClient'
import { describeStudentInsightsServiceContract, STUDENT_INSIGHTS } from '@/test/contracts/studentInsightsServiceContract'
import { createHttpStudentInsightsService } from './httpStudentInsightsService'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// docs/openapi.yaml, schema StudentInsights
function toApi(insights: StudentInsights) {
  return {
    lessons_count: insights.lessonsCount,
    completed_materials: insights.completedMaterials,
    average_score: insights.averageScore,
    pending_materials: insights.pendingMaterials.map(({ lessonId, topic, date, exerciseCount }) => ({
      lesson_id: lessonId,
      topic,
      date,
      exercise_count: exerciseCount,
    })),
    recent_activity: insights.recentActivity.map(({ type, date, lessonId, topic, score }) => ({
      type,
      date,
      lesson_id: lessonId,
      topic,
      score,
    })),
    calendar: insights.calendar.map(({ id, start, topic }) => ({ lesson_id: id, start, topic })),
    score_history: insights.scoreHistory.map(({ lessonId, topic, submittedAt, score }) => ({
      lesson_id: lessonId,
      topic,
      submitted_at: submittedAt,
      score,
    })),
  }
}

// Back falso que responde como GET /students/me/insights según docs/openapi.yaml
function createFakeBackend(insights: StudentInsights): typeof fetch {
  return async (input, init) => {
    const path = new URL(String(input)).pathname
    if (init?.method !== 'GET') return json(405, { detail: 'Method Not Allowed' })
    if (path === '/students/me/insights') return json(200, toApi(insights))
    return json(404, { detail: 'Not Found' })
  }
}

function createService(fetchFn: typeof fetch) {
  return createHttpStudentInsightsService(createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'token', fetchFn }))
}

describe('httpStudentInsightsService', () => {
  describeStudentInsightsServiceContract((insights) => createService(createFakeBackend(insights)))

  it('pide los indicadores a GET /students/me/insights', async () => {
    const fetchFn = vi.fn(createFakeBackend(STUDENT_INSIGHTS))

    await createService(fetchFn).getInsights()

    expect(fetchFn).toHaveBeenCalledWith('http://api.test/students/me/insights', expect.objectContaining({ method: 'GET' }))
  })

  it('propaga el error si el usuario no es estudiante (403)', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json(403, { detail: 'No tienes permiso para acceder a este recurso' }))

    await expect(createService(fetchFn).getInsights()).rejects.toEqual(
      new ApiError(403, 'No tienes permiso para acceder a este recurso'),
    )
  })
})
