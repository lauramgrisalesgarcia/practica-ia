import type { LessonSummary, MaterialStatus } from '../../domain/lesson'
import type { HttpClient } from '../../http/httpClient'
import type { TeacherLessonService } from './teacherLessonService'

// Forma de la clase en la API (docs/openapi.yaml, schema LessonBase)
interface ApiLessonSummary {
  id: string
  date: string
  duration_minutes: number
  topic: string
  context: string
  material_status: MaterialStatus
}

function toLessonSummary({ id, date, duration_minutes, topic, context, material_status }: ApiLessonSummary): LessonSummary {
  return { id, date, durationMinutes: duration_minutes, topic, context, materialStatus: material_status }
}

export function createHttpTeacherLessonService(http: HttpClient): TeacherLessonService {
  return {
    async getStudentLessons(studentId) {
      const lessons = await http.get<ApiLessonSummary[]>(`/teachers/me/students/${encodeURIComponent(studentId)}/lessons`)
      return lessons.map(toLessonSummary)
    },
  }
}
