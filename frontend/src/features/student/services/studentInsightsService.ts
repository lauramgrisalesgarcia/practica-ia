import type { StudentInsights } from '@/domain/studentInsights'

// Indicadores del panel del estudiante con sesión iniciada
export interface StudentInsightsService {
  getInsights: () => Promise<StudentInsights>
}
