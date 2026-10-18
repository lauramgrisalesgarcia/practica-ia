// Indicadores del panel del docente
export interface WeeklyCount {
  // Lunes de la semana (ISO 8601, fecha)
  weekStart: string
  count: number
}

export type ActivityType = 'submission' | 'material' | 'lesson'

export interface RecentActivity {
  id: string
  type: ActivityType
  date: string
  lessonId: string
  studentName: string
  topic: string
  // Porcentaje de aciertos; solo en las entregas
  score: number | null
}

// Clase en el calendario del docente
export interface CalendarLesson {
  id: string
  // Fecha y hora de inicio (ISO 8601)
  start: string
  studentName: string
  topic: string
}

export interface TeacherInsights {
  // true si los datos son de ejemplo (modo de desarrollo sin back)
  lessonsThisMonth: number
  pendingMaterials: number
  materialStatus: { completed: number; pending: number; none: number }
  weeklyLessons: WeeklyCount[]
  recentActivity: RecentActivity[]
  calendar: CalendarLesson[]
}
