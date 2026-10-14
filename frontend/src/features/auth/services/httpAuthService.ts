import type { Role, User } from '@/domain/user'
import { ApiError } from '@/shared/http/errors'
import type { HttpClient } from '@/shared/http/httpClient'
import type { AuthService } from './authService'
import type { SessionExpiry } from './sessionExpiry'
import type { TokenStorage } from './tokenStorage'

// Forma del usuario en la API (docs/openapi.yaml, schema User)
interface ApiUser {
  id: string
  first_name: string
  last_name: string
  email: string
  role: Role
}

interface LoginResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  user: ApiUser
}

interface HttpAuthServiceOptions {
  http: HttpClient
  tokenStorage: TokenStorage
  // Lo dispara el cliente HTTP cuando la API rechaza el token
  sessionExpiry: SessionExpiry
}

function toUser({ first_name, last_name, email, role }: ApiUser): User {
  return { name: `${first_name} ${last_name}`, email, role }
}

export function createHttpAuthService({ http, tokenStorage, sessionExpiry }: HttpAuthServiceOptions): AuthService {
  // El token rechazado ya no sirve: se borra antes de avisar a nadie
  sessionExpiry.subscribe(() => tokenStorage.clear())

  return {
    async login(credentials) {
      // Un token antiguo no debe enviarse con el login
      tokenStorage.clear()
      const response = await http.post<LoginResponse>('/auth/login', credentials)
      tokenStorage.set(response.access_token)
      return toUser(response.user)
    },
    async getCurrentUser() {
      if (!tokenStorage.get()) return null
      try {
        return toUser(await http.get<ApiUser>('/auth/me'))
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          tokenStorage.clear()
          return null
        }
        throw error
      }
    },
    async logout() {
      tokenStorage.clear()
    },
    onSessionExpired(listener) {
      return sessionExpiry.subscribe(listener)
    },
  }
}
