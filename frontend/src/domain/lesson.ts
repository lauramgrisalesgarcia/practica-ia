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
