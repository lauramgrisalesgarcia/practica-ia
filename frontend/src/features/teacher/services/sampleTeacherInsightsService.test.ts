import { describeTeacherInsightsServiceContract } from '@/test/contracts/teacherInsightsServiceContract'
import { createSampleTeacherInsightsService } from './sampleTeacherInsightsService'

describe('sampleTeacherInsightsService', () => {
  describeTeacherInsightsServiceContract(() => createSampleTeacherInsightsService({ delayMs: 0 }))

  it('marca sus datos como de ejemplo', async () => {
    const insights = await createSampleTeacherInsightsService({ delayMs: 0 }).getInsights()

    expect(insights.isSample).toBe(true)
  })

  it('devuelve siempre los mismos datos', async () => {
    const service = createSampleTeacherInsightsService({ delayMs: 0 })

    await expect(service.getInsights()).resolves.toEqual(await service.getInsights())
  })
})
