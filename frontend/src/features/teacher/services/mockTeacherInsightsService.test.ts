import { TEACHER_INSIGHTS } from '@/dev/devTeacherInsights'
import { describeTeacherInsightsServiceContract } from '@/test/contracts/teacherInsightsServiceContract'
import { createMockTeacherInsightsService } from './mockTeacherInsightsService'

describe('mockTeacherInsightsService', () => {
  describeTeacherInsightsServiceContract(() => createMockTeacherInsightsService({ insights: TEACHER_INSIGHTS, delayMs: 0 }))

  it('devuelve los indicadores que recibe', async () => {
    const service = createMockTeacherInsightsService({ insights: TEACHER_INSIGHTS, delayMs: 0 })

    await expect(service.getInsights()).resolves.toEqual(TEACHER_INSIGHTS)
  })
})
