import type { Student } from '../teacher/TeacherDashboard'
import type { LoginCredentials } from './LoginForm'

export type Role = 'docente' | 'estudiante'

export interface User {
  name: string
  email: string
  role: Role
}

export interface AuthService {
  login: (credentials: LoginCredentials) => Promise<User>
  getAssignedStudents: (teacher: User) => Promise<Student[]>
}
