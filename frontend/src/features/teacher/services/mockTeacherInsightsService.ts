import type { TeacherInsights } from '@/domain/insights'
import { DEV_DELAY_MS, wait } from '@/dev/wait'
import type { TeacherInsightsService } from './teacherInsightsService'

interface MockTeacherInsightsServiceOptions {
  insights: TeacherInsights
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockTeacherInsightsService({
  insights,
  delayMs = DEV_DELAY_MS,
}: MockTeacherInsightsServiceOptions): TeacherInsightsService {
  return {
    async getInsights() {
      await wait(delayMs)
      return insights
    },
  }
}
