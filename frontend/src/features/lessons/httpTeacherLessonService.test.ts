import { createHttpClient } from '../../http/httpClient'
import {
  describeTeacherLessonServiceContract,
  EMMA_ID,
  EMMA_LESSONS,
  type LessonsByStudent,
} from '../../test/contracts/teacherLessonServiceContract'
import { createHttpTeacherLessonService } from './httpTeacherLessonService'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// Back falso que responde como GET /teachers/me/students/{student_id}/lessons según docs/openapi.yaml
function createFakeBackend(lessons: LessonsByStudent): typeof fetch {
  return async (input, init) => {
    const match = /^\/teachers\/me\/students\/([^/]+)\/lessons$/.exec(new URL(String(input)).pathname)
    if (!match || init?.method !== 'GET') return json(404, { detail: 'Not Found' })
    const studentId = decodeURIComponent(match[1])
    if (!Object.hasOwn(lessons, studentId)) return json(404, { detail: 'Estudiante no encontrado' })
    return json(
      200,
      lessons[studentId].map(({ id, date, durationMinutes, topic, context, materialStatus }) => ({
        id,
        date,
        duration_minutes: durationMinutes,
        topic,
        context,
        material_status: materialStatus,
      })),
    )
  }
}

function createService(fetchFn: typeof fetch) {
  return createHttpTeacherLessonService(createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'token', fetchFn }))
}

describe('httpTeacherLessonService', () => {
  describeTeacherLessonServiceContract((lessons) => createService(createFakeBackend(lessons)))

  it('pide el historial a GET /teachers/me/students/{id}/lessons escapando el identificador', async () => {
    const fetchFn = vi.fn(createFakeBackend({ [EMMA_ID]: EMMA_LESSONS }))

    await createService(fetchFn).getStudentLessons('a/b').catch(() => {})

    expect(fetchFn).toHaveBeenCalledWith(
      'http://api.test/teachers/me/students/a%2Fb/lessons',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})
