import { ApiError } from '@/shared/http/errors'
import { createHttpClient } from '@/shared/http/httpClient'
import { describeTeacherInsightsServiceContract } from '@/test/contracts/teacherInsightsServiceContract'
import { createHttpTeacherInsightsService } from './httpTeacherInsightsService'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const LESSON_ID = 'c4a9e2d7-5f1b-4c8e-a3d6-7b2e9f0c1d45'

// Respuesta de GET /teachers/me/insights según docs/openapi.yaml (schema TeacherInsights)
const API_INSIGHTS = {
  lessons_this_month: 3,
  pending_materials: 1,
  material_status: { completed: 2, pending: 1, none: 1 },
  weekly_lessons: [
    { week_start: '2026-08-24', count: 0 },
    { week_start: '2026-08-31', count: 1 },
    { week_start: '2026-09-07', count: 0 },
    { week_start: '2026-09-14', count: 0 },
    { week_start: '2026-09-21', count: 0 },
    { week_start: '2026-09-28', count: 1 },
    { week_start: '2026-10-05', count: 1 },
    { week_start: '2026-10-12', count: 1 },
  ],
  recent_activity: [
    {
      type: 'submission',
      date: '2026-10-12T18:05:00Z',
      lesson_id: LESSON_ID,
      student_name: 'Emma Schmidt',
      topic: 'Pedir en un restaurante',
      score: 66.67,
    },
    {
      type: 'lesson',
      date: '2026-10-08T16:00:00Z',
      lesson_id: LESSON_ID,
      student_name: 'Emma Schmidt',
      topic: 'Pedir en un restaurante',
      score: null,
    },
  ],
  calendar: [
    { lesson_id: LESSON_ID, start: '2026-10-08T16:00:00Z', student_name: 'Emma Schmidt', topic: 'Pedir en un restaurante' },
  ],
}

// Back falso que responde como GET /teachers/me/insights según docs/openapi.yaml
function createFakeBackend(): typeof fetch {
  return async (input, init) => {
    const path = new URL(String(input)).pathname
    if (init?.method !== 'GET') return json(405, { detail: 'Method Not Allowed' })
    if (path === '/teachers/me/insights') return json(200, API_INSIGHTS)
    return json(404, { detail: 'Not Found' })
  }
}

function createService(fetchFn: typeof fetch = createFakeBackend()) {
  return createHttpTeacherInsightsService(createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'token', fetchFn }))
}

describe('httpTeacherInsightsService', () => {
  describeTeacherInsightsServiceContract(() => createService())

  it('pide los indicadores a GET /teachers/me/insights', async () => {
    const fetchFn = vi.fn(createFakeBackend())

    await createService(fetchFn).getInsights()

    expect(fetchFn).toHaveBeenCalledWith('http://api.test/teachers/me/insights', expect.objectContaining({ method: 'GET' }))
  })

  it('convierte la respuesta de la API al dominio y marca los datos como reales', async () => {
    const insights = await createService().getInsights()

    expect(insights).toEqual({
      lessonsThisMonth: 3,
      pendingMaterials: 1,
      materialStatus: { completed: 2, pending: 1, none: 1 },
      weeklyLessons: API_INSIGHTS.weekly_lessons.map(({ week_start, count }) => ({ weekStart: week_start, count })),
      recentActivity: [
        {
          id: `submission-${LESSON_ID}`,
          type: 'submission',
          date: '2026-10-12T18:05:00Z',
          lessonId: LESSON_ID,
          studentName: 'Emma Schmidt',
          topic: 'Pedir en un restaurante',
          score: 66.67,
        },
        {
          id: `lesson-${LESSON_ID}`,
          type: 'lesson',
          date: '2026-10-08T16:00:00Z',
          lessonId: LESSON_ID,
          studentName: 'Emma Schmidt',
          topic: 'Pedir en un restaurante',
          score: null,
        },
      ],
      calendar: [{ id: LESSON_ID, start: '2026-10-08T16:00:00Z', studentName: 'Emma Schmidt', topic: 'Pedir en un restaurante' }],
    })
  })

  it('propaga el error si el usuario no es docente (403)', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json(403, { detail: 'No tienes permiso para acceder a este recurso' }))

    await expect(createService(fetchFn).getInsights()).rejects.toEqual(
      new ApiError(403, 'No tienes permiso para acceder a este recurso'),
    )
  })
})
