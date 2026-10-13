import type { StudentDetail } from '../../domain/student'
import { ApiError } from '../../http/errors'
import { createHttpClient } from '../../http/httpClient'
import { describeTeacherServiceContract, TEST_STUDENTS } from '../../test/contracts/teacherServiceContract'
import { createHttpTeacherService } from './httpTeacherService'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// Back falso que responde como /teachers/me/students y /{student_id} según docs/openapi.yaml
function createFakeBackend(students: StudentDetail[]): typeof fetch {
  const apiStudents = students.map(({ id, name, email, nativeLanguage, level, lessonsCount }) => {
    const [firstName, ...lastNames] = name.split(' ')
    const student = { id, first_name: firstName, last_name: lastNames.join(' '), email, native_language: nativeLanguage, level }
    return { student, detail: { ...student, lessons_count: lessonsCount } }
  })

  return async (input, init) => {
    const path = new URL(String(input)).pathname
    if (init?.method !== 'GET') return json(405, { detail: 'Method Not Allowed' })
    if (path === '/teachers/me/students') return json(200, apiStudents.map((s) => s.student))
    const match = /^\/teachers\/me\/students\/([^/]+)$/.exec(path)
    if (match) {
      const found = apiStudents.find((s) => s.student.id === decodeURIComponent(match[1]))
      return found ? json(200, found.detail) : json(404, { detail: 'Estudiante no encontrado' })
    }
    return json(404, { detail: 'Not Found' })
  }
}

function createService(fetchFn: typeof fetch) {
  return createHttpTeacherService(createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'token', fetchFn }))
}

describe('httpTeacherService', () => {
  describeTeacherServiceContract((students) => createService(createFakeBackend(students)))

  it('pide los alumnos a GET /teachers/me/students', async () => {
    const fetchFn = vi.fn(createFakeBackend(TEST_STUDENTS))

    await createService(fetchFn).getAssignedStudents()

    expect(fetchFn).toHaveBeenCalledWith('http://api.test/teachers/me/students', expect.objectContaining({ method: 'GET' }))
  })

  it('pide el detalle a GET /teachers/me/students/{id} escapando el identificador', async () => {
    const fetchFn = vi.fn(createFakeBackend(TEST_STUDENTS))

    await createService(fetchFn).getStudent('a/b').catch(() => {})

    expect(fetchFn).toHaveBeenCalledWith('http://api.test/teachers/me/students/a%2Fb', expect.objectContaining({ method: 'GET' }))
  })

  it('propaga el error si el usuario no es docente (403)', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json(403, { detail: 'No tienes permiso para acceder a este recurso' }))

    await expect(createService(fetchFn).getAssignedStudents()).rejects.toEqual(
      new ApiError(403, 'No tienes permiso para acceder a este recurso'),
    )
  })
})
