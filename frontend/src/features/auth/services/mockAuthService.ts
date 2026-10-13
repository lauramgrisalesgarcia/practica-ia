import type { User } from '@/domain/user'
import { wait } from '@/dev/wait'
import type { AuthService } from './authService'

interface MockAuthServiceOptions {
  users: { user: User; password: string }[]
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockAuthService({ users, delayMs = 500 }: MockAuthServiceOptions): AuthService {
  let currentUser: User | null = null

  return {
    async login({ email, password }) {
      await wait(delayMs)
      const account = users.find((u) => u.user.email.toLowerCase() === email.toLowerCase())
      if (!account || account.password !== password) throw new Error('Credenciales incorrectas')
      currentUser = account.user
      return account.user
    },
    async getCurrentUser() {
      return currentUser
    },
    async logout() {
      currentUser = null
    },
  }
}
