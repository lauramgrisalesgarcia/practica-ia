import type { User } from '../../domain/user'
import { wait } from '../../dev/wait'
import type { AuthService } from './authService'

interface MockAuthServiceOptions {
  users: { user: User; password: string }[]
  delayMs?: number
}

// Servicio en memoria hasta conectar el frontend con el backend
export function createMockAuthService({ users, delayMs = 500 }: MockAuthServiceOptions): AuthService {
  return {
    async login({ email, password }) {
      await wait(delayMs)
      const account = users.find((u) => u.user.email.toLowerCase() === email.toLowerCase())
      if (!account || account.password !== password) throw new Error('Credenciales incorrectas')
      return account.user
    },
  }
}
