import type { Role } from '@/domain/user'

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

export const LESSON_DETAIL_ROUTE = '/docente/clases/:lessonId'

export function lessonDetailPath(lessonId: string): string {
  return `/docente/clases/${encodeURIComponent(lessonId)}`
}

// Historial de clases del estudiante
export const STUDENT_LESSONS_PATH = '/estudiante/clases'

export const STUDENT_LESSON_ROUTE = '/estudiante/clases/:lessonId'

export function studentLessonPath(lessonId: string): string {
  return `/estudiante/clases/${encodeURIComponent(lessonId)}`
}

// Ancla del formulario de generar material en la página de la clase
export const GENERATE_MATERIAL_ANCHOR = 'generar-material'

export function generateMaterialPath(lessonId: string): string {
  return `${lessonDetailPath(lessonId)}#${GENERATE_MATERIAL_ANCHOR}`
}
