import { createServices } from './composition'

describe('createServices', () => {
  beforeEach(() => sessionStorage.clear())

  it('usa la API real cuando hay URL configurada', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }))
    const { authService } = createServices({ apiUrl: '/api', fetchFn })

    await authService.login({ email: 'docente@colegio.edu', password: 'x' }).catch(() => {})

    expect(fetchFn).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({ method: 'POST' }))
  })

  it('pide los alumnos del docente a la API real cuando hay URL configurada', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('[]', { status: 200 }))
    const { teacherService } = createServices({ apiUrl: '/api', fetchFn })

    await teacherService.getAssignedStudents()

    expect(fetchFn).toHaveBeenCalledWith('/api/teachers/me/students', expect.objectContaining({ method: 'GET' }))
  })

  it('pide el historial de clases a la API real cuando hay URL configurada', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('[]', { status: 200 }))
    const { teacherLessonService } = createServices({ apiUrl: '/api', fetchFn })

    await teacherLessonService.getStudentLessons('abc')

    expect(fetchFn).toHaveBeenCalledWith('/api/teachers/me/students/abc/lessons', expect.objectContaining({ method: 'GET' }))
  })

  it('pide las clases del estudiante a la API real cuando hay URL configurada', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('[]', { status: 200 }))
    const { studentService } = createServices({ apiUrl: '/api', fetchFn })

    await studentService.getMyLessons()

    expect(fetchFn).toHaveBeenCalledWith('/api/students/me/lessons', expect.objectContaining({ method: 'GET' }))
  })

  it('pide los indicadores del docente a la API real cuando hay URL configurada', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }))
    const { teacherInsightsService } = createServices({ apiUrl: '/api', fetchFn })

    await teacherInsightsService.getInsights().catch(() => {})

    expect(fetchFn).toHaveBeenCalledWith('/api/teachers/me/insights', expect.objectContaining({ method: 'GET' }))
  })

  it('pide los indicadores del estudiante a la API real cuando hay URL configurada', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }))
    const { studentInsightsService } = createServices({ apiUrl: '/api', fetchFn })

    await studentInsightsService.getInsights().catch(() => {})

    expect(fetchFn).toHaveBeenCalledWith('/api/students/me/insights', expect.objectContaining({ method: 'GET' }))
  })

  it('usa los servicios de desarrollo en memoria si no hay URL configurada', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const { authService } = createServices({ apiUrl: undefined, fetchFn })

    await expect(authService.login({ email: 'docente@colegio.edu', password: 'Docente#2026' })).resolves.toMatchObject({
      name: 'María López',
    })
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
