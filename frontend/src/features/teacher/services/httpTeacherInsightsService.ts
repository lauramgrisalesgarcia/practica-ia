import type { ActivityType, TeacherInsights } from '@/domain/insights'
import type { HttpClient } from '@/shared/http/httpClient'
import type { TeacherInsightsService } from './teacherInsightsService'

// Forma de los indicadores en la API (docs/openapi.yaml, schema TeacherInsights)
interface ApiTeacherInsights {
  lessons_this_month: number
  pending_materials: number
  material_status: { completed: number; pending: number; none: number }
  weekly_lessons: { week_start: string; count: number }[]
  recent_activity: {
    type: ActivityType
    date: string
    lesson_id: string
    student_name: string
    topic: string
    score: number | null
  }[]
  calendar: { lesson_id: string; start: string; student_name: string; topic: string }[]
}

function toInsights(api: ApiTeacherInsights): TeacherInsights {
  return {
    lessonsThisMonth: api.lessons_this_month,
    pendingMaterials: api.pending_materials,
    materialStatus: api.material_status,
    weeklyLessons: api.weekly_lessons.map(({ week_start, count }) => ({ weekStart: week_start, count })),
    // Cada clase tiene como mucho una actividad de cada tipo: el tipo y la clase la identifican
    recentActivity: api.recent_activity.map(({ type, date, lesson_id, student_name, topic, score }) => ({
      id: `${type}-${lesson_id}`,
      type,
      date,
      lessonId: lesson_id,
      studentName: student_name,
      topic,
      score,
    })),
    calendar: api.calendar.map(({ lesson_id, start, student_name, topic }) => ({
      id: lesson_id,
      start,
      studentName: student_name,
      topic,
    })),
  }
}

export function createHttpTeacherInsightsService(http: HttpClient): TeacherInsightsService {
  return {
    async getInsights() {
      return toInsights(await http.get<ApiTeacherInsights>('/teachers/me/insights'))
    },
  }
}
