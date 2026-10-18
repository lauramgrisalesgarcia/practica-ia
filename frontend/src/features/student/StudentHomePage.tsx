import { Link } from 'react-router'
import type { StudentInsights } from '@/domain/studentInsights'
import { STUDENT_LESSONS_PATH } from '@/shared/routes/paths'
import { StudentInsightsPanel } from './components/StudentInsightsPanel'

interface StudentHomePageProps {
  name: string
  // Debe ser una referencia estable: cada cambio vuelve a cargar el resumen
  loadInsights: () => Promise<StudentInsights>
}

export function StudentHomePage({ name, loadInsights }: StudentHomePageProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium uppercase tracking-wide text-ocean">Panel del estudiante</p>
          <h1 className="text-3xl font-semibold text-ink">Hola, {name}</h1>
        </div>
        <Link
          to={STUDENT_LESSONS_PATH}
          className="flex items-center gap-2 rounded-xl bg-ocean px-5 py-3 font-semibold text-white shadow-[0_4px_0_0] shadow-ink transition hover:-translate-y-0.5 hover:bg-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h12" />
          </svg>
          Ver mis clases
        </Link>
      </header>
      <StudentInsightsPanel loadInsights={loadInsights} />
    </div>
  )
}
