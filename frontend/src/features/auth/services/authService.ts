import type { LoginCredentials } from '@/domain/auth'
import type { User } from '@/domain/user'

export interface AuthService {
  login: (credentials: LoginCredentials) => Promise<User>
  getCurrentUser: () => Promise<User | null>
  logout: () => Promise<void>
  // Avisa cuando la sesión caduca (la API rechaza el token); devuelve la función para darse de baja
  onSessionExpired: (listener: () => void) => () => void
}
