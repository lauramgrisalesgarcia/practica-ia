import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ServicesProvider } from '../services/ServicesProvider'
import type { Services } from '../services/servicesContext'

function createFakeServices(): Services {
  return {
    authService: {
      login: vi.fn().mockRejectedValue(new Error('login no configurado en el test')),
      getCurrentUser: vi.fn().mockResolvedValue(null),
      logout: vi.fn().mockResolvedValue(undefined),
    },
    teacherService: { getAssignedStudents: vi.fn().mockResolvedValue([]) },
  }
}

interface RenderWithServicesOptions {
  services?: Partial<Services>
}

export function renderWithServices(
  ui: ReactElement,
  options: RenderWithServicesOptions = {},
): RenderResult & { services: Services } {
  const services = { ...createFakeServices(), ...options.services }
  return { ...render(<ServicesProvider services={services}>{ui}</ServicesProvider>), services }
}
