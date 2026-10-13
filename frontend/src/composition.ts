import { devAuthService, devTeacherService } from './dev/devServices'
import { createHttpAuthService } from './features/auth/httpAuthService'
import { createBrowserTokenStorage } from './features/auth/tokenStorage'
import { createHttpClient } from './http/httpClient'
import type { Services } from './services/servicesContext'

interface CompositionOptions {
  apiUrl: string | undefined
  fetchFn?: typeof fetch
}

// Único lugar que elige las implementaciones de los servicios
export function createServices({ apiUrl, fetchFn }: CompositionOptions): Services {
  if (!apiUrl) return { authService: devAuthService, teacherService: devTeacherService }

  const tokenStorage = createBrowserTokenStorage()
  const http = createHttpClient({ baseUrl: apiUrl, getToken: tokenStorage.get, fetchFn })
  return {
    authService: createHttpAuthService({ http, tokenStorage }),
    // Pendiente de la fase 4: HttpTeacherService
    teacherService: devTeacherService,
  }
}
