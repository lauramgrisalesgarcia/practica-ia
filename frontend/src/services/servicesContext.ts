import { createContext, useContext } from 'react'
import type { AuthService } from '../features/auth/authService'
import type { TeacherLessonService } from '../features/lessons/teacherLessonService'
import type { StudentService } from '../features/student/studentService'
import type { TeacherService } from '../features/teacher/teacherService'

export interface Services {
  authService: AuthService
  teacherService: TeacherService
  teacherLessonService: TeacherLessonService
  studentService: StudentService
}

export const ServicesContext = createContext<Services | null>(null)

export function useServices(): Services {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('useServices debe usarse dentro de ServicesProvider')
  return services
}
