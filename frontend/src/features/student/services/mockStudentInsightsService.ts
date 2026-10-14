import type { StudentInsights } from '@/domain/studentInsights'
import { wait } from '@/dev/wait'
import type { StudentInsightsService } from './studentInsightsService'

interface MockStudentInsightsServiceOptions {
  insights: StudentInsights
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockStudentInsightsService({
  insights,
  delayMs = 500,
}: MockStudentInsightsServiceOptions): StudentInsightsService {
  return {
    async getInsights() {
      await wait(delayMs)
      return insights
    },
  }
}
