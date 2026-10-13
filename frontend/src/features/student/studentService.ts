import type { LessonPdf, StudentLessonSummary } from '../../domain/lesson'

// Clases del estudiante con sesión iniciada
export interface StudentService {
  // Clases ya realizadas, de la más reciente a la más antigua
  getMyLessons: () => Promise<StudentLessonSummary[]>
  // Falla con «Clase no encontrada» si no existe o es de otro estudiante
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
}
