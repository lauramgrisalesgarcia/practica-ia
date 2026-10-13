import type { LessonPdf, StudentLessonSummary, StudentMaterial } from '../../domain/lesson'

// Clases del estudiante con sesión iniciada
export interface StudentService {
  // Clases ya realizadas, de la más reciente a la más antigua
  getMyLessons: () => Promise<StudentLessonSummary[]>
  // Falla con «Clase no encontrada» si no existe o es de otro estudiante
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  // Actividad sin las respuestas correctas, con el resultado si ya la resolvió.
  // Falla con «Clase no encontrada» o «La clase no tiene material de refuerzo».
  getMaterial: (lessonId: string) => Promise<StudentMaterial>
}
