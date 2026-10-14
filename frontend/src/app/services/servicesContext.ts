import { createContext, useContext } from 'react'
import type { AuthService } from '@/features/auth/services/authService'
import type { TeacherLessonService } from '@/features/teacher/services/teacherLessonService'
import type { StudentService } from '@/features/student/services/studentService'
import type { TeacherInsightsService } from '@/features/teacher/services/teacherInsightsService'
import type { TeacherService } from '@/features/teacher/services/teacherService'

export interface Services {
  authService: AuthService
  teacherService: TeacherService
  teacherLessonService: TeacherLessonService
  studentService: StudentService
  teacherInsightsService: TeacherInsightsService
}

export const ServicesContext = createContext<Services | null>(null)

export function useServices(): Services {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('useServices debe usarse dentro de ServicesProvider')
  return services
}
