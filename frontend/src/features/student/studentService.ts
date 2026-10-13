import type { Answer, LessonPdf, StudentLessonSummary, StudentMaterial, StudentSubmission } from '../../domain/lesson'

// Clases del estudiante con sesión iniciada
export interface StudentService {
  // Clases ya realizadas, de la más reciente a la más antigua
  getMyLessons: () => Promise<StudentLessonSummary[]>
  // Falla con «Clase no encontrada» si no existe o es de otro estudiante
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  // Actividad sin las respuestas correctas, con el resultado si ya la resolvió.
  // Falla con «Clase no encontrada» o «La clase no tiene material de refuerzo».
  getMaterial: (lessonId: string) => Promise<StudentMaterial>
  // Envía una respuesta por ejercicio (una única vez) y devuelve el resultado corregido.
  // Falla si ya lo resolvió, si faltan respuestas o no son válidas, o si fallan las
  // recomendaciones del LLM (en ese caso el intento no se guarda).
  submitMaterial: (lessonId: string, answers: Answer[]) => Promise<StudentSubmission>
}
