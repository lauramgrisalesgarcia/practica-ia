import type { StudentInsights } from '@/domain/studentInsights'
import { StudentInsightsPanel } from './components/StudentInsightsPanel'

interface StudentHomePageProps {
  name: string
  // Debe ser una referencia estable: cada cambio vuelve a cargar el resumen
  loadInsights: () => Promise<StudentInsights>
}

export function StudentHomePage({ name, loadInsights }: StudentHomePageProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-ink/70">Panel del estudiante</p>
        <h1 className="text-2xl font-semibold text-ink">Hola, {name}</h1>
      </header>
      <StudentInsightsPanel loadInsights={loadInsights} />
    </div>
  )
}
