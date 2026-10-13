import type { LessonDetail, LessonPdf, LessonSummary } from '../../domain/lesson'

// Clases de los alumnos del docente con sesión iniciada
export interface TeacherLessonService {
  // De la más reciente a la más antigua; falla con «Estudiante no encontrado» si no es su alumno
  getStudentLessons: (studentId: string) => Promise<LessonSummary[]>
  // Fallan con «Clase no encontrada» si no existe o es de otro docente
  getLesson: (lessonId: string) => Promise<LessonDetail>
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
}
