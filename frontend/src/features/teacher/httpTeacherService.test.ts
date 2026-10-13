import type { Student } from '../../domain/student'
import { ApiError } from '../../http/errors'
import { createHttpClient } from '../../http/httpClient'
import { describeTeacherServiceContract, TEST_STUDENTS } from '../../test/contracts/teacherServiceContract'
import { createHttpTeacherService } from './httpTeacherService'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// Back falso que responde como GET /teachers/me/students según docs/openapi.yaml
function createFakeBackend(students: Student[]): typeof fetch {
  const apiStudents = students.map(({ id, name, email, nativeLanguage, level }) => {
    const [firstName, ...lastNames] = name.split(' ')
    return { id, first_name: firstName, last_name: lastNames.join(' '), email, native_language: nativeLanguage, level }
  })

  return async (input, init) => {
    const path = new URL(String(input)).pathname
    if (path === '/teachers/me/students' && init?.method === 'GET') return json(200, apiStudents)
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

  it('propaga el error si el usuario no es docente (403)', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json(403, { detail: 'No tienes permiso para acceder a este recurso' }))

    await expect(createService(fetchFn).getAssignedStudents()).rejects.toEqual(
      new ApiError(403, 'No tienes permiso para acceder a este recurso'),
    )
  })
})
