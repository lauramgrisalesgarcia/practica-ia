import type { Student } from '../teacher/TeacherDashboard'
import type { AuthService, User } from './authService'

interface MockAuthServiceOptions {
  users: { user: User; password: string }[]
  students: Record<string, Student[]>
  delayMs?: number
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Servicio en memoria hasta que existan los endpoints del backend
export function createMockAuthService({
  users,
  students,
  delayMs = 500,
}: MockAuthServiceOptions): AuthService {
  return {
    async login({ email, password }) {
      await wait(delayMs)
      const account = users.find((u) => u.user.email.toLowerCase() === email.toLowerCase())
      if (!account || account.password !== password) throw new Error('Credenciales incorrectas')
      return account.user
    },
    async getAssignedStudents(teacher) {
      await wait(delayMs)
      return students[teacher.email] ?? []
    },
  }
}
