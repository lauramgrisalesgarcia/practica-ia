import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AuthService } from '@/features/auth/services/authService'
import { SessionProvider } from '@/features/auth/session/SessionProvider'
import { AuthenticatedLayout } from './AuthenticatedLayout'

describe('AuthenticatedLayout', () => {
  it('muestra el contenido de la página y permite cerrar sesión', async () => {
    const authService: AuthService = {
      login: vi.fn(),
      getCurrentUser: vi.fn().mockResolvedValue({ name: 'Ana Gómez', email: 'ana@colegio.edu', role: 'estudiante' }),
      logout: vi.fn().mockResolvedValue(undefined),
      onSessionExpired: vi.fn(() => () => {}),
    }
    render(
      <SessionProvider authService={authService}>
        <AuthenticatedLayout>
          <p>contenido de la página</p>
        </AuthenticatedLayout>
      </SessionProvider>,
    )

    expect(screen.getByText('contenido de la página')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /cerrar sesión/i }))

    expect(authService.logout).toHaveBeenCalled()
  })

  it('muestra la barra superior con el logo y el usuario con sesión', async () => {
    const authService: AuthService = {
      login: vi.fn(),
      getCurrentUser: vi.fn().mockResolvedValue({ name: 'Ana Gómez', email: 'ana@colegio.edu', role: 'estudiante' }),
      logout: vi.fn(),
      onSessionExpired: vi.fn(() => () => {}),
    }
    render(
      <SessionProvider authService={authService}>
        <AuthenticatedLayout>
          <p>contenido</p>
        </AuthenticatedLayout>
      </SessionProvider>,
    )

    const banner = screen.getByRole('banner')
    expect(within(banner).getByRole('img', { name: 'PractIcA' })).toBeInTheDocument()
    expect(await within(banner).findByText('Ana Gómez')).toBeInTheDocument()
    expect(within(banner).getByText('Estudiante')).toBeInTheDocument()
  })
})
