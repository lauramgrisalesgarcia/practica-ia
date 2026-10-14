import type { ActivityType } from './insights'

// Indicadores del panel del estudiante

// Refuerzo generado que el estudiante aún no ha resuelto
export interface PendingMaterial {
  lessonId: string
  topic: string
  // Fecha de la clase (ISO 8601)
  date: string
  exerciseCount: number
}

export interface StudentActivity {
  id: string
  type: ActivityType
  date: string
  lessonId: string
  topic: string
  // Porcentaje de aciertos; solo en las entregas
  score: number | null
}

export interface StudentCalendarLesson {
  id: string
  start: string
  topic: string
}

// Nota de un refuerzo resuelto, para la evolución de la nota
export interface ScorePoint {
  lessonId: string
  topic: string
  submittedAt: string
  score: number
}

export interface StudentInsights {
  lessonsCount: number
  completedMaterials: number
  // null si aún no ha resuelto ningún refuerzo
  averageScore: number | null
  // De la clase más reciente a la más antigua
  pendingMaterials: PendingMaterial[]
  // Las 10 más recientes, de la más reciente a la más antigua
  recentActivity: StudentActivity[]
  // Clases de los últimos 6 meses, en orden cronológico
  calendar: StudentCalendarLesson[]
  // Últimos 10 refuerzos resueltos, en orden cronológico
  scoreHistory: ScorePoint[]
}
