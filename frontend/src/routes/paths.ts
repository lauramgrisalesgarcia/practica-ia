import type { Role } from '../domain/user'

export const LOGIN_PATH = '/login'

const HOME_PATHS: Record<Role, string> = {
  docente: '/docente',
  estudiante: '/estudiante',
}

export function homePathFor(role: Role): string {
  return HOME_PATHS[role]
}

export const STUDENT_DETAIL_ROUTE = '/docente/alumnos/:studentId'

export function studentDetailPath(studentId: string): string {
  return `/docente/alumnos/${encodeURIComponent(studentId)}`
}
