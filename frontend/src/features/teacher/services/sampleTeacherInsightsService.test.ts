import { createSampleTeacherInsightsService } from './sampleTeacherInsightsService'

describe('sampleTeacherInsightsService', () => {
  it('marca sus datos como de ejemplo', async () => {
    const insights = await createSampleTeacherInsightsService({ delayMs: 0 }).getInsights()

    expect(insights.isSample).toBe(true)
  })

  it('devuelve las últimas 8 semanas en orden cronológico', async () => {
    const { weeklyLessons } = await createSampleTeacherInsightsService({ delayMs: 0 }).getInsights()

    expect(weeklyLessons).toHaveLength(8)
    const starts = weeklyLessons.map((week) => week.weekStart)
    expect([...starts].sort()).toEqual(starts)
  })

  it('incluye clases en el calendario ordenadas por fecha', async () => {
    const { calendar } = await createSampleTeacherInsightsService({ delayMs: 0 }).getInsights()

    expect(calendar.length).toBeGreaterThan(0)
    const starts = calendar.map((lesson) => lesson.start)
    expect([...starts].sort()).toEqual(starts)
  })

  it('cada actividad reciente indica su tipo', async () => {
    const { recentActivity } = await createSampleTeacherInsightsService({ delayMs: 0 }).getInsights()

    for (const activity of recentActivity) expect(['submission', 'material', 'lesson']).toContain(activity.type)
  })

  it('es coherente: los materiales pendientes coinciden con el estado del material', async () => {
    const insights = await createSampleTeacherInsightsService({ delayMs: 0 }).getInsights()

    expect(insights.pendingMaterials).toBe(insights.materialStatus.pending)
  })

  it('devuelve siempre los mismos datos', async () => {
    const service = createSampleTeacherInsightsService({ delayMs: 0 })

    await expect(service.getInsights()).resolves.toEqual(await service.getInsights())
  })
})
