import { createContext, useContext } from 'react'
import type { AuthService } from '../features/auth/authService'
import type { TeacherService } from '../features/teacher/teacherService'

export interface Services {
  authService: AuthService
  teacherService: TeacherService
}

export const ServicesContext = createContext<Services | null>(null)

export function useServices(): Services {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('useServices debe usarse dentro de ServicesProvider')
  return services
}
