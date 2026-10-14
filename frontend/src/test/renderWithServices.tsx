import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ServicesProvider } from '@/app/services/ServicesProvider'
import type { Services } from '@/app/services/servicesContext'

function createFakeServices(): Services {
  return {
    authService: {
      login: vi.fn().mockRejectedValue(new Error('login no configurado en el test')),
      getCurrentUser: vi.fn().mockResolvedValue(null),
      logout: vi.fn().mockResolvedValue(undefined),
      onSessionExpired: vi.fn(() => () => {}),
    },
    teacherService: {
      getAssignedStudents: vi.fn().mockResolvedValue([]),
      getStudent: vi.fn().mockRejectedValue(new Error('getStudent no configurado en el test')),
    },
    teacherLessonService: {
      getStudentLessons: vi.fn().mockResolvedValue([]),
      getLesson: vi.fn().mockRejectedValue(new Error('getLesson no configurado en el test')),
      downloadPdf: vi.fn().mockRejectedValue(new Error('downloadPdf no configurado en el test')),
      generateMaterial: vi.fn().mockRejectedValue(new Error('generateMaterial no configurado en el test')),
    },
    studentService: {
      getMyLessons: vi.fn().mockResolvedValue([]),
      getLesson: vi.fn().mockRejectedValue(new Error('getLesson no configurado en el test')),
      downloadPdf: vi.fn().mockRejectedValue(new Error('downloadPdf no configurado en el test')),
      getMaterial: vi.fn().mockRejectedValue(new Error('getMaterial no configurado en el test')),
      submitMaterial: vi.fn().mockRejectedValue(new Error('submitMaterial no configurado en el test')),
    },
    teacherInsightsService: { getInsights: vi.fn().mockReturnValue(new Promise(() => {})) },
    studentInsightsService: { getInsights: vi.fn().mockReturnValue(new Promise(() => {})) },
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
