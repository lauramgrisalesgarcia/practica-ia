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

  it('usa los servicios de desarrollo en memoria si no hay URL configurada', async () => {
    const fetchFn = vi.fn<typeof fetch>()
    const { authService } = createServices({ apiUrl: undefined, fetchFn })

    await expect(authService.login({ email: 'docente@colegio.edu', password: 'Docente#2026' })).resolves.toMatchObject({
      name: 'María López',
    })
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
