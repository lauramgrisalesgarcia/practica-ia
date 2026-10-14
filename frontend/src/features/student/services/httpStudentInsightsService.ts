import type { ActivityType } from '@/domain/insights'
import type { StudentInsights } from '@/domain/studentInsights'
import type { HttpClient } from '@/shared/http/httpClient'
import type { StudentInsightsService } from './studentInsightsService'

// Forma de los indicadores en la API (docs/openapi.yaml, schema StudentInsights)
interface ApiStudentInsights {
  lessons_count: number
  completed_materials: number
  average_score: number | null
  pending_materials: { lesson_id: string; topic: string; date: string; exercise_count: number }[]
  recent_activity: { type: ActivityType; date: string; lesson_id: string; topic: string; score: number | null }[]
  calendar: { lesson_id: string; start: string; topic: string }[]
  score_history: { lesson_id: string; topic: string; submitted_at: string; score: number }[]
}

function toInsights(api: ApiStudentInsights): StudentInsights {
  return {
    lessonsCount: api.lessons_count,
    completedMaterials: api.completed_materials,
    averageScore: api.average_score,
    pendingMaterials: api.pending_materials.map(({ lesson_id, topic, date, exercise_count }) => ({
      lessonId: lesson_id,
      topic,
      date,
      exerciseCount: exercise_count,
    })),
    // Cada clase tiene como mucho una actividad de cada tipo: el tipo y la clase la identifican
    recentActivity: api.recent_activity.map(({ type, date, lesson_id, topic, score }) => ({
      id: `${type}-${lesson_id}`,
      type,
      date,
      lessonId: lesson_id,
      topic,
      score,
    })),
    calendar: api.calendar.map(({ lesson_id, start, topic }) => ({ id: lesson_id, start, topic })),
    scoreHistory: api.score_history.map(({ lesson_id, topic, submitted_at, score }) => ({
      lessonId: lesson_id,
      topic,
      submittedAt: submitted_at,
      score,
    })),
  }
}

export function createHttpStudentInsightsService(http: HttpClient): StudentInsightsService {
  return {
    async getInsights() {
      return toInsights(await http.get<ApiStudentInsights>('/students/me/insights'))
    },
  }
}
