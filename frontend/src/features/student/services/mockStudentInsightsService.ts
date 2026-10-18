import type { StudentInsights } from '@/domain/studentInsights'
import { DEV_DELAY_MS, wait } from '@/dev/wait'
import type { StudentInsightsService } from './studentInsightsService'

interface MockStudentInsightsServiceOptions {
  insights: StudentInsights
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockStudentInsightsService({
  insights,
  delayMs = DEV_DELAY_MS,
}: MockStudentInsightsServiceOptions): StudentInsightsService {
  return {
    async getInsights() {
      await wait(delayMs)
      return insights
    },
  }
}
