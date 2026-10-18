import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@/domain/user'
import type { AuthService } from '@/features/auth/services/authService'
import { SessionProvider } from './SessionProvider'
import { useSession } from './sessionContext'

const TEACHER_SIGNED_IN = 'usuario: María López'
const ANONYMOUS = 'estado: anonymous'
const SESSION_EXPIRED = 'sesión caducada'

const TEACHER: User = { name: 'María López', email: 'docente@colegio.edu', role: 'docente' }

function createAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    login: vi.fn().mockResolvedValue(TEACHER),
    getCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue(undefined),
    onSessionExpired: vi.fn(() => () => {}),
    ...overrides,
  }
}

function SessionProbe() {
  const session = useSession()
  return (
    <>
      <p>estado: {session.status}</p>
      {session.status === 'anonymous' && session.expired && <p>sesión caducada</p>}
      {session.status === 'authenticated' && <p>usuario: {session.user.name}</p>}
      <button onClick={() => session.login({ email: TEACHER.email, password: 'x' })}>entrar</button>
      <button onClick={() => session.logout()}>salir</button>
    </>
  )
}

function renderSession(authService: AuthService) {
  return render(
    <SessionProvider authService={authService}>
      <SessionProbe />
    </SessionProvider>,
  )
}

describe('SessionProvider', () => {
  it('empieza comprobando si ya hay una sesión', () => {
    renderSession(createAuthService({ getCurrentUser: () => new Promise(() => {}) }))

    expect(screen.getByText('estado: loading')).toBeInTheDocument()
  })

  it('recupera la sesión existente al arrancar', async () => {
    renderSession(createAuthService({ getCurrentUser: vi.fn().mockResolvedValue(TEACHER) }))

    expect(await screen.findByText(TEACHER_SIGNED_IN)).toBeInTheDocument()
    expect(screen.getByText('estado: authenticated')).toBeInTheDocument()
  })

  it('queda sin sesión si no hay usuario actual', async () => {
    renderSession(createAuthService())

    expect(await screen.findByText(ANONYMOUS)).toBeInTheDocument()
  })

  it('queda sin sesión si no se puede comprobar (p. ej. sin conexión)', async () => {
    renderSession(createAuthService({ getCurrentUser: vi.fn().mockRejectedValue(new Error('sin red')) }))

    expect(await screen.findByText(ANONYMOUS)).toBeInTheDocument()
  })

  it('inicia sesión con el servicio y guarda el usuario', async () => {
    const authService = createAuthService()
    renderSession(authService)
    await screen.findByText(ANONYMOUS)

    await userEvent.setup().click(screen.getByRole('button', { name: 'entrar' }))

    expect(await screen.findByText(TEACHER_SIGNED_IN)).toBeInTheDocument()
    expect(authService.login).toHaveBeenCalledWith({ email: TEACHER.email, password: 'x' })
  })

  it('cierra la sesión con el servicio y olvida al usuario', async () => {
    const authService = createAuthService({ getCurrentUser: vi.fn().mockResolvedValue(TEACHER) })
    renderSession(authService)
    await screen.findByText(TEACHER_SIGNED_IN)

    await userEvent.setup().click(screen.getByRole('button', { name: 'salir' }))

    await waitFor(() => expect(screen.getByText(ANONYMOUS)).toBeInTheDocument())
    expect(authService.logout).toHaveBeenCalled()
  })

  describe(SESSION_EXPIRED, () => {
    function createExpiringAuthService() {
      let expire = () => {}
      const unsubscribe = vi.fn()
      const authService = createAuthService({
        getCurrentUser: vi.fn().mockResolvedValue(TEACHER),
        onSessionExpired: vi.fn((listener: () => void) => {
          expire = listener
          return unsubscribe
        }),
      })
      return { authService, unsubscribe, expire: () => act(() => expire()) }
    }

    it('cierra la sesión e indica que ha caducado cuando el servicio avisa', async () => {
      const { authService, expire } = createExpiringAuthService()
      renderSession(authService)
      await screen.findByText(TEACHER_SIGNED_IN)

      await expire()

      expect(screen.getByText(ANONYMOUS)).toBeInTheDocument()
      expect(screen.getByText(SESSION_EXPIRED)).toBeInTheDocument()
    })

    it('un cierre de sesión voluntario no se marca como caducado', async () => {
      const authService = createAuthService({ getCurrentUser: vi.fn().mockResolvedValue(TEACHER) })
      renderSession(authService)
      await screen.findByText(TEACHER_SIGNED_IN)

      await userEvent.setup().click(screen.getByRole('button', { name: 'salir' }))

      await waitFor(() => expect(screen.getByText(ANONYMOUS)).toBeInTheDocument())
      expect(screen.queryByText(SESSION_EXPIRED)).not.toBeInTheDocument()
    })

    it('deja de escuchar al desmontarse', async () => {
      const { authService, unsubscribe } = createExpiringAuthService()
      const { unmount } = renderSession(authService)
      await screen.findByText(TEACHER_SIGNED_IN)

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })
})
