import type { LessonSummary } from '../../domain/lesson'

// Clases de los alumnos del docente con sesión iniciada
export interface TeacherLessonService {
  // De la más reciente a la más antigua; falla con «Estudiante no encontrado» si no es su alumno
  getStudentLessons: (studentId: string) => Promise<LessonSummary[]>
}
