import type { TeacherInsightsService } from '@/features/teacher/services/teacherInsightsService'

// Comportamiento común de toda implementación de TeacherInsightsService
export function describeTeacherInsightsServiceContract(createService: () => TeacherInsightsService) {
  describe('contrato de TeacherInsightsService', () => {
    it('devuelve las últimas 8 semanas en orden cronológico', async () => {
      const { weeklyLessons } = await createService().getInsights()

      expect(weeklyLessons).toHaveLength(8)
      const starts = weeklyLessons.map((week) => week.weekStart)
      expect([...starts].sort()).toEqual(starts)
    })

    it('ordena el calendario por fecha', async () => {
      const { calendar } = await createService().getInsights()

      expect(calendar.length).toBeGreaterThan(0)
      const starts = calendar.map((lesson) => lesson.start)
      expect([...starts].sort()).toEqual(starts)
    })

    it('ordena la actividad reciente de la más reciente a la más antigua, con identificadores únicos', async () => {
      const { recentActivity } = await createService().getInsights()

      expect(recentActivity.length).toBeGreaterThan(0)
      expect(recentActivity.length).toBeLessThanOrEqual(10)
      const dates = recentActivity.map((activity) => activity.date)
      expect([...dates].sort().reverse()).toEqual(dates)
      expect(new Set(recentActivity.map((activity) => activity.id)).size).toBe(recentActivity.length)
    })

    it('solo las entregas tienen nota', async () => {
      const { recentActivity } = await createService().getInsights()

      for (const activity of recentActivity) {
        expect(activity.type === 'submission' || activity.score === null).toBe(true)
      }
    })

    it('es coherente: los materiales pendientes coinciden con el estado del material', async () => {
      const insights = await createService().getInsights()

      expect(insights.pendingMaterials).toBe(insights.materialStatus.pending)
    })
  })
}
