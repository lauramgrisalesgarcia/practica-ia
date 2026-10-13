import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import App from './App'
import type { StudentDetail } from './domain/student'
import type { User } from './domain/user'
import type { AuthService } from './features/auth/authService'
import { SessionProvider } from './features/session/SessionProvider'
import type { TeacherService } from './features/teacher/teacherService'
import { renderWithServices } from './test/renderWithServices'

const TEACHER: User = { name: 'María López', email: 'docente@colegio.edu', role: 'docente' }
const STUDENT: User = { name: 'Ana Gómez', email: 'estudiante@colegio.edu', role: 'estudiante' }
const PASSWORD = 'Secreto#123'
const EMMA: StudentDetail = {
  id: '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83',
  name: 'Emma Schmidt',
  email: 'emma@correo.com',
  nativeLanguage: 'de',
  level: 'A2',
  lessonsCount: 12,
}

function createAuthService({ account = null, current = null }: { account?: User | null; current?: User | null } = {}): AuthService {
  return {
    login: vi.fn(async () => {
      if (!account) throw new Error('Credenciales incorrectas')
      return account
    }),
    getCurrentUser: vi.fn().mockResolvedValue(current),
    logout: vi.fn().mockResolvedValue(undefined),
  }
}

function createTeacherService(): TeacherService {
  return { getAssignedStudents: vi.fn().mockResolvedValue([]), getStudent: vi.fn().mockResolvedValue(EMMA) }
}

function CurrentPath() {
  return <output aria-label="ruta actual">{useLocation().pathname}</output>
}

function renderApp(path: string, authService: AuthService, teacherService = createTeacherService()) {
  return renderWithServices(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider>
        <App />
        <CurrentPath />
      </SessionProvider>
    </MemoryRouter>,
    { services: { authService, teacherService } },
  )
}

async function expectPath(path: string) {
  await waitFor(() => expect(screen.getByLabelText('ruta actual')).toHaveTextContent(new RegExp(`^${path}$`)))
}

async function login(email: string) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText(/correo electrónico/i), email)
  await user.type(screen.getByLabelText(/contraseña/i), PASSWORD)
  await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
}

describe('App', () => {
  it('muestra un aviso de carga mientras comprueba la sesión', () => {
    const authService = createAuthService()
    authService.getCurrentUser = () => new Promise(() => {})
    renderApp('/docente', authService)

    expect(screen.getByText(/cargando/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/correo electrónico/i)).not.toBeInTheDocument()
  })

  describe('sin sesión', () => {
    it.each(['/', '/docente', '/estudiante', '/no-existe'])('%s lleva al inicio de sesión', async (path) => {
      renderApp(path, createAuthService())

      expect(await screen.findByRole('heading', { level: 1, name: /iniciar sesión/i })).toBeInTheDocument()
      await expectPath('/login')
    })

    it('lleva al docente a su panel tras iniciar sesión', async () => {
      const authService = createAuthService({ account: TEACHER })
      const teacherService = createTeacherService()
      renderApp('/login', authService, teacherService)

      await login(TEACHER.email)

      expect(await screen.findByRole('heading', { level: 1, name: /maría lópez/i })).toBeInTheDocument()
      await expectPath('/docente')
      expect(authService.login).toHaveBeenCalledWith({ email: TEACHER.email, password: PASSWORD })

      await userEvent.setup().click(screen.getByRole('button', { name: /ver alumnos asignados/i }))
      expect(teacherService.getAssignedStudents).toHaveBeenCalled()
    })

    it('lleva al estudiante a su panel tras iniciar sesión', async () => {
      renderApp('/login', createAuthService({ account: STUDENT }))

      await login(STUDENT.email)

      expect(await screen.findByRole('heading', { level: 1, name: /ana gómez/i })).toBeInTheDocument()
      await expectPath('/estudiante')
    })

    it('se queda en el login si las credenciales son incorrectas', async () => {
      renderApp('/login', createAuthService())

      await login('nadie@colegio.edu')

      expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales incorrectas')
      await expectPath('/login')
    })
  })

  describe('con sesión', () => {
    it.each(['/', '/login', '/no-existe'])('%s lleva al docente a su panel', async (path) => {
      renderApp(path, createAuthService({ current: TEACHER }))

      expect(await screen.findByRole('heading', { level: 1, name: /maría lópez/i })).toBeInTheDocument()
      await expectPath('/docente')
    })

    it('no deja a un estudiante entrar al panel del docente', async () => {
      renderApp('/docente', createAuthService({ current: STUDENT }))

      expect(await screen.findByRole('heading', { level: 1, name: /ana gómez/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /ver alumnos asignados/i })).not.toBeInTheDocument()
      await expectPath('/estudiante')
    })

    it('no deja a un docente entrar al panel del estudiante', async () => {
      renderApp('/estudiante', createAuthService({ current: TEACHER }))

      await expectPath('/docente')
    })

    it('muestra al docente el detalle de un alumno', async () => {
      const teacherService = createTeacherService()
      renderApp(`/docente/alumnos/${EMMA.id}`, createAuthService({ current: TEACHER }), teacherService)

      expect(await screen.findByRole('heading', { level: 1, name: 'Emma Schmidt' })).toBeInTheDocument()
      expect(teacherService.getStudent).toHaveBeenCalledWith(EMMA.id)
    })

    it('no deja a un estudiante ver el detalle de un alumno', async () => {
      const teacherService = createTeacherService()
      renderApp(`/docente/alumnos/${EMMA.id}`, createAuthService({ current: STUDENT }), teacherService)

      await expectPath('/estudiante')
      expect(teacherService.getStudent).not.toHaveBeenCalled()
    })

    it('vuelve al inicio de sesión al cerrar sesión', async () => {
      const authService = createAuthService({ current: TEACHER })
      renderApp('/docente', authService)

      await userEvent.setup().click(await screen.findByRole('button', { name: /cerrar sesión/i }))

      expect(await screen.findByRole('heading', { level: 1, name: /iniciar sesión/i })).toBeInTheDocument()
      await expectPath('/login')
      expect(authService.logout).toHaveBeenCalled()
    })
  })
})
