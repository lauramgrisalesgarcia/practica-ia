import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router'
import { createBrowserTokenStorage } from '@/features/auth/services/tokenStorage'
import { SessionProvider } from '@/features/auth/session/SessionProvider'
import App from './App'
import { createServices } from './composition'
import { ServicesProvider } from './services/ServicesProvider'

const TEACHER = { id: 't1', first_name: 'María', last_name: 'López', email: 'docente@colegio.edu', role: 'docente' }

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// Back en el que la sesión sigue siendo válida para /auth/me pero el token ya no sirve para lo demás:
// así ocurre cuando el JWT caduca mientras el docente tiene la app abierta
function createExpiringBackend(): typeof fetch {
  return async (input) => {
    const path = new URL(String(input), 'http://localhost').pathname
    if (path === '/api/auth/me') return json(200, TEACHER)
    return json(401, { detail: 'No autenticado' })
  }
}

function CurrentPath() {
  return <output aria-label="ruta actual">{useLocation().pathname}</output>
}

function renderRealApp(fetchFn: typeof fetch) {
  const services = createServices({ apiUrl: '/api', fetchFn })
  render(
    <ServicesProvider services={services}>
      <MemoryRouter initialEntries={['/docente']}>
        <SessionProvider authService={services.authService}>
          <App />
          <CurrentPath />
        </SessionProvider>
      </MemoryRouter>
    </ServicesProvider>,
  )
}

describe('sesión caducada', () => {
  beforeEach(() => {
    sessionStorage.clear()
    createBrowserTokenStorage().set('token-caducado')
  })

  it('cierra la sesión y lleva al login si la API responde 401 a una petición con token', async () => {
    renderRealApp(createExpiringBackend())

    // Recorre la app completa (sesión, panel, petición rechazada y redirección): más margen que el segundo por defecto
    expect(await screen.findByRole('heading', { level: 1, name: /iniciar sesión/i }, { timeout: 3000 })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('ruta actual')).toHaveTextContent('/login'))
    // El <output> de la ruta también es role=status: se busca el aviso por su texto
    expect(screen.getByText('Tu sesión ha caducado. Vuelve a iniciar sesión.')).toHaveAttribute('role', 'status')
    expect(createBrowserTokenStorage().get()).toBeNull()
  })
})
