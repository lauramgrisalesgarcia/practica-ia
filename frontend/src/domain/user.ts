export type Role = 'docente' | 'estudiante'

export interface User {
  name: string
  email: string
  role: Role
}
