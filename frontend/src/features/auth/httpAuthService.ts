import type { Role, User } from '../../domain/user'
import { ApiError } from '../../http/errors'
import type { HttpClient } from '../../http/httpClient'
import type { AuthService } from './authService'
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
}

function toUser({ first_name, last_name, email, role }: ApiUser): User {
  return { name: `${first_name} ${last_name}`, email, role }
}

export function createHttpAuthService({ http, tokenStorage }: HttpAuthServiceOptions): AuthService {
  return {
    async login(credentials) {
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
  }
}
