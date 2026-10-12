import type { LoginCredentials } from '../../domain/auth'
import type { User } from '../../domain/user'

export interface AuthService {
  login: (credentials: LoginCredentials) => Promise<User>
}
