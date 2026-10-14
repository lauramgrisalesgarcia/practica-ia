import { devAuthService, devStudentService, devTeacherLessonService, devTeacherService } from '@/dev/devServices'
import { createHttpAuthService } from '@/features/auth/services/httpAuthService'
import { createSessionExpiry } from '@/features/auth/services/sessionExpiry'
import { createBrowserTokenStorage } from '@/features/auth/services/tokenStorage'
import { createHttpTeacherInsightsService } from '@/features/teacher/services/httpTeacherInsightsService'
import { createHttpTeacherLessonService } from '@/features/teacher/services/httpTeacherLessonService'
import { createHttpStudentService } from '@/features/student/services/httpStudentService'
import { createSampleTeacherInsightsService } from '@/features/teacher/services/sampleTeacherInsightsService'
import { createHttpTeacherService } from '@/features/teacher/services/httpTeacherService'
import { createHttpClient } from '@/shared/http/httpClient'
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
      teacherInsightsService: createSampleTeacherInsightsService(),
    }
  }

  const tokenStorage = createBrowserTokenStorage()
  const sessionExpiry = createSessionExpiry()
  const http = createHttpClient({ baseUrl: apiUrl, getToken: tokenStorage.get, fetchFn, onUnauthorized: sessionExpiry.notify })
  return {
    authService: createHttpAuthService({ http, tokenStorage, sessionExpiry }),
    teacherService: createHttpTeacherService(http),
    teacherLessonService: createHttpTeacherLessonService(http),
    studentService: createHttpStudentService(http),
    teacherInsightsService: createHttpTeacherInsightsService(http),
  }
}
