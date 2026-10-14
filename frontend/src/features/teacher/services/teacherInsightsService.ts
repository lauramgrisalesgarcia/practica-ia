import type { TeacherInsights } from '@/domain/insights'

// Indicadores del panel del docente con sesión iniciada
export interface TeacherInsightsService {
  getInsights: () => Promise<TeacherInsights>
}
