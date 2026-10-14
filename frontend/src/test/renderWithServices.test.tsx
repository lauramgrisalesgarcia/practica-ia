import { screen } from '@testing-library/react'
import type { AuthService } from '@/features/auth/services/authService'
import { useServices } from '@/app/services/servicesContext'
import { renderWithServices } from './renderWithServices'

function AuthProbe() {
  const { authService } = useServices()
  return <span>{typeof authService.login === 'function' ? 'servicios disponibles' : ''}</span>
}

describe('renderWithServices', () => {
  it('renderiza el componente con servicios falsos por defecto', async () => {
    const { services } = renderWithServices(<AuthProbe />)

    expect(screen.getByText('servicios disponibles')).toBeInTheDocument()
    await expect(services.teacherService.getAssignedStudents()).resolves.toEqual([])
    await expect(services.authService.login({ email: 'x@colegio.edu', password: 'x' })).rejects.toThrow(/no configurado/)
  })

  it('permite sustituir solo los servicios que el test necesita', () => {
    const authService: AuthService = {
      login: vi.fn(),
      getCurrentUser: vi.fn(),
      logout: vi.fn(),
      onSessionExpired: vi.fn(() => () => {}),
    }

    const { services } = renderWithServices(<AuthProbe />, { services: { authService } })

    expect(services.authService).toBe(authService)
    expect(services.teacherService).toBeDefined()
  })
})
