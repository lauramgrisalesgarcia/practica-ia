import type { TeacherInsights } from '@/domain/insights'
import { wait } from '@/dev/wait'
import type { TeacherInsightsService } from './teacherInsightsService'

interface MockTeacherInsightsServiceOptions {
  insights: TeacherInsights
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockTeacherInsightsService({
  insights,
  delayMs = 500,
}: MockTeacherInsightsServiceOptions): TeacherInsightsService {
  return {
    async getInsights() {
      await wait(delayMs)
      return insights
    },
  }
}
