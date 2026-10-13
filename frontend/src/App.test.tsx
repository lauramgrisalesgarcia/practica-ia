import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import type { User } from './domain/user'
import type { AuthService } from './features/auth/authService'
import type { TeacherService } from './features/teacher/teacherService'
import { SessionProvider } from './features/session/SessionProvider'
import { renderWithServices } from './test/renderWithServices'

const TEACHER: User = { name: 'María López', email: 'docente@colegio.edu', role: 'docente' }
const STUDENT: User = { name: 'Ana Gómez', email: 'estudiante@colegio.edu', role: 'estudiante' }
const PASSWORD = 'Secreto#123'

function createAuthService(user: User | null, overrides: Partial<AuthService> = {}): AuthService {
  return {
    login: vi.fn(async () => {
      if (!user) throw new Error('Credenciales incorrectas')
      return user
    }),
    getCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function createTeacherService(): TeacherService {
  return { getAssignedStudents: vi.fn().mockResolvedValue([]) }
}

function renderApp(options: Parameters<typeof renderWithServices>[1]) {
  return renderWithServices(
    <SessionProvider>
      <App />
    </SessionProvider>,
    options,
  )
}

async function login(email: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/correo electrónico/i), email)
  await user.type(screen.getByLabelText(/contraseña/i), PASSWORD)
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
}

describe('App', () => {
  it('muestra un aviso de carga mientras comprueba la sesión', () => {
    renderApp({ services: { authService: createAuthService(null, { getCurrentUser: () => new Promise(() => {}) }) } })

    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/correo electrónico/i)).not.toBeInTheDocument()
  })

  it('entra directamente al dashboard si ya había sesión', async () => {
    renderApp({
      services: {
        authService: createAuthService(TEACHER, { getCurrentUser: vi.fn().mockResolvedValue(TEACHER) }),
        teacherService: createTeacherService(),
      },
    })

    expect(await screen.findByRole('heading', { level: 1, name: /maría lópez/i })).toBeInTheDocument()
  })

  it('vuelve al inicio de sesión al cerrar sesión', async () => {
    const authService = createAuthService(TEACHER, { getCurrentUser: vi.fn().mockResolvedValue(TEACHER) })
    renderApp({ services: { authService, teacherService: createTeacherService() } })

    await userEvent.setup().click(await screen.findByRole('button', { name: /cerrar sesión/i }))

    expect(await screen.findByRole('heading', { level: 1, name: /iniciar sesión/i })).toBeInTheDocument()
    expect(authService.logout).toHaveBeenCalled()
  })

  it('muestra la pantalla de inicio de sesión', async () => {
    renderApp({ services: { authService: createAuthService(TEACHER), teacherService: createTeacherService() } })

    expect(await screen.findByRole('heading', { level: 1, name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('lleva al docente a su dashboard tras iniciar sesión', async () => {
    const authService = createAuthService(TEACHER)
    const teacherService = createTeacherService()
    renderApp({ services: { authService, teacherService } })

    await login(TEACHER.email)

    expect(await screen.findByRole('heading', { level: 1, name: /maría lópez/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver alumnos asignados/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/correo electrónico/i)).not.toBeInTheDocument()
    expect(authService.login).toHaveBeenCalledWith({ email: TEACHER.email, password: PASSWORD })

    await userEvent.setup().click(screen.getByRole('button', { name: /ver alumnos asignados/i }))
    expect(teacherService.getAssignedStudents).toHaveBeenCalledWith(TEACHER)
  })

  it('no muestra el dashboard del docente a un estudiante', async () => {
    renderApp({ services: { authService: createAuthService(STUDENT), teacherService: createTeacherService() } })

    await login(STUDENT.email)

    expect(await screen.findByRole('heading', { level: 1, name: /ana gómez/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ver alumnos asignados/i })).not.toBeInTheDocument()
  })

  it('se queda en el login si las credenciales son incorrectas', async () => {
    renderApp({ services: { authService: createAuthService(null), teacherService: createTeacherService() } })

    await login('nadie@colegio.edu')

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas')
    expect(screen.getByRole('heading', { level: 1, name: /iniciar sesión/i })).toBeInTheDocument()
  })
})
