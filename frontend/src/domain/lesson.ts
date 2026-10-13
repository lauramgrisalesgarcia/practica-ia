import type { Level } from './student'

// - none: sin material; pending: generado, sin resolver; completed: resuelto por el estudiante
export type MaterialStatus = 'none' | 'pending' | 'completed'

export interface LessonSummary {
  id: string
  // Fecha y hora de la clase en ISO 8601 (UTC)
  date: string
  durationMinutes: number
  topic: string
  context: string
  materialStatus: MaterialStatus
}

// En el alcance del proyecto solo existe «completar la frase»
export type ActivityType = 'complete_sentence'

export interface ExerciseWithAnswer {
  id: number
  sentence: string
  options: string[]
  correctOption: string
}

// Material de refuerzo con las respuestas correctas (vista del docente)
export interface TeacherMaterial {
  generatedAt: string
  activityType: ActivityType
  title: string
  instructions: string
  exercises: ExerciseWithAnswer[]
}

export interface SubmissionSummary {
  submittedAt: string
  correctCount: number
  incorrectCount: number
  // Porcentaje de aciertos (0-100)
  score: number
}

export interface LessonStudent {
  id: string
  name: string
  nativeLanguage: string
  level: Level
}

export interface LessonDetail extends LessonSummary {
  keywords: string[]
  notes: string | null
  pdfFilename: string
  student: LessonStudent
  // null si aún no se ha generado
  material: TeacherMaterial | null
  // null si el alumno aún no lo ha resuelto
  submission: SubmissionSummary | null
}

export interface LessonPdf {
  blob: Blob
  filename: string
}

export const MIN_EXERCISES = 1
export const MAX_EXERCISES = 15

export interface MaterialRequest {
  activityType: ActivityType
  // Entre MIN_EXERCISES y MAX_EXERCISES
  exerciseCount: number
  // Palabras clave revisadas por el docente; si se omiten se usan las de la clase.
  // Solo valen para esta generación: no modifican las de la clase.
  keywords?: string[]
}

// Clase en el historial del estudiante: incluye el nombre de su PDF
export interface StudentLessonSummary extends LessonSummary {
  pdfFilename: string
}
