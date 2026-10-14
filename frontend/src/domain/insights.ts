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
  studentName: string
  description: string
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
  // true mientras los datos son de ejemplo (aún no hay endpoint en el back)
  isSample: boolean
  lessonsThisMonth: number
  pendingMaterials: number
  materialStatus: { completed: number; pending: number; none: number }
  weeklyLessons: WeeklyCount[]
  recentActivity: RecentActivity[]
  calendar: CalendarLesson[]
}
