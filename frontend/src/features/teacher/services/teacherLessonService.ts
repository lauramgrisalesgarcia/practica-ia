import type { LessonDetail, LessonPdf, MaterialRequest, TeacherLessonSummary, TeacherMaterial } from '@/domain/lesson'

// Clases de los alumnos del docente con sesión iniciada
export interface TeacherLessonService {
  // De la más reciente a la más antigua; falla con «Estudiante no encontrado» si no es su alumno
  getStudentLessons: (studentId: string) => Promise<TeacherLessonSummary[]>
  // Fallan con «Clase no encontrada» si no existe o es de otro docente
  getLesson: (lessonId: string) => Promise<LessonDetail>
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  // Genera el material de refuerzo (una única vez) y lo deja pendiente de resolver.
  // Falla si la clase aún no se ha realizado, si ya tiene material
  // o si la respuesta del LLM no es válida (en ese caso no se guarda nada).
  generateMaterial: (lessonId: string, request: MaterialRequest) => Promise<TeacherMaterial>
}
