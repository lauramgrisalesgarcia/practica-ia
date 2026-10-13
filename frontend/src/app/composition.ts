import { devAuthService, devStudentService, devTeacherLessonService, devTeacherService } from '../dev/devServices'
import { createHttpAuthService } from '../features/auth/services/httpAuthService'
import { createBrowserTokenStorage } from '../features/auth/services/tokenStorage'
import { createHttpTeacherLessonService } from '../features/teacher/services/httpTeacherLessonService'
import { createHttpStudentService } from '../features/student/services/httpStudentService'
import { createHttpTeacherService } from '../features/teacher/services/httpTeacherService'
import { createHttpClient } from '../shared/http/httpClient'
import type { Services } from './services/servicesContext'

interface CompositionOptions {
  apiUrl: string | undefined
  fetchFn?: typeof fetch
}

// Único lugar que elige las implementaciones de los servicios
export function createServices({ apiUrl, fetchFn }: CompositionOptions): Services {
  if (!apiUrl) {
    return {
      authService: devAuthService,
      teacherService: devTeacherService,
      teacherLessonService: devTeacherLessonService,
      studentService: devStudentService,
    }
  }

  const tokenStorage = createBrowserTokenStorage()
  const http = createHttpClient({ baseUrl: apiUrl, getToken: tokenStorage.get, fetchFn })
  return {
    authService: createHttpAuthService({ http, tokenStorage }),
    teacherService: createHttpTeacherService(http),
    teacherLessonService: createHttpTeacherLessonService(http),
    studentService: createHttpStudentService(http),
  }
}
