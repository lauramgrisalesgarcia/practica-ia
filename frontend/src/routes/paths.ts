import type { Role } from '../domain/user'

export const LOGIN_PATH = '/login'

const HOME_PATHS: Record<Role, string> = {
  docente: '/docente',
  estudiante: '/estudiante',
}

export function homePathFor(role: Role): string {
  return HOME_PATHS[role]
}
