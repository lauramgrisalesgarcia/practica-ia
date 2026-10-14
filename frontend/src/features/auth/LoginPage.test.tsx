import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { User } from '@/domain/user'
import { LoginPage } from './LoginPage'
import type { AuthService } from './services/authService'
import { SessionProvider } from './session/SessionProvider'

const TEACHER: User = { name: 'María López', email: 'docente@colegio.edu', role: 'docente' }

function createAuthService(current: User | null = null): AuthService {
  return {
    login: vi.fn().mockResolvedValue(TEACHER),
    getCurrentUser: vi.fn().mockResolvedValue(current),
    logout: vi.fn().mockResolvedValue(undefined),
  }
}

function renderLoginPage(authService: AuthService) {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <SessionProvider authService={authService}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/docente" element={<p>panel del docente</p>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('muestra el formulario de inicio de sesión', async () => {
    renderLoginPage(createAuthService())

    expect(await screen.findByRole('heading', { level: 1, name: /iniciar sesión/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument()
  })

  it('muestra el logo de la plataforma', async () => {
    renderLoginPage(createAuthService())

    expect(await screen.findByRole('img', { name: 'PractIcA' })).toBeInTheDocument()
  })

  it('inicia sesión con las credenciales y lleva al panel del rol', async () => {
    const authService = createAuthService()
    renderLoginPage(authService)
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText(/correo electrónico/i), TEACHER.email)
    await user.type(screen.getByLabelText(/contraseña/i), 'Secreto#123')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    expect(await screen.findByText('panel del docente')).toBeInTheDocument()
    expect(authService.login).toHaveBeenCalledWith({ email: TEACHER.email, password: 'Secreto#123' })
  })

  it('lleva al panel del rol si ya hay sesión', async () => {
    renderLoginPage(createAuthService(TEACHER))

    await waitFor(() => expect(screen.getByText('panel del docente')).toBeInTheDocument())
  })
})
