import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { ActivityType } from '@/domain/insights'
import type { StudentInsights } from '@/domain/studentInsights'
import { BarChart } from '@/shared/components/charts/BarChart'
import { LessonCalendar } from '@/shared/components/LessonCalendar'
import { formatDate } from '@/shared/i18n/formatDate'
import { studentLessonPath } from '@/shared/routes/paths'
import { formatScore } from './formatScore'
import { studentActivityDescription } from './studentActivityDescription'

interface StudentInsightsPanelProps {
  // Debe ser una referencia estable: cada cambio vuelve a cargar los indicadores
  loadInsights: () => Promise<StudentInsights>
  today?: Date
  // Zona horaria del calendario y de la gráfica (por defecto, la del navegador)
  timeZone?: string
}

type InsightsState =
  | { status: 'loading' }
  | { status: 'loaded'; insights: StudentInsights }
  | { status: 'error'; message: string }

// El tipo siempre lleva etiqueta de texto: el icono y el color solo la acompañan
const ACTIVITY_TYPES: Record<ActivityType, { label: string; icon: string; style: string }> = {
  submission: { label: 'Refuerzo resuelto', icon: 'M5 12l5 5L20 7', style: 'bg-mint text-ink' },
  material: { label: 'Refuerzo nuevo', icon: 'M12 5v14M5 12h14', style: 'bg-teal text-white' },
  lesson: { label: 'Clase', icon: 'M4 6h16M4 12h16M4 18h10', style: 'bg-ocean text-white' },
}

export function StudentInsightsPanel({ loadInsights, today = new Date(), timeZone }: StudentInsightsPanelProps) {
  const [state, setState] = useState<InsightsState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadInsights().then(
      (insights) => active && setState({ status: 'loaded', insights }),
      (error: unknown) =>
        active &&
        setState({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar tu resumen' }),
    )
    return () => {
      active = false
    }
  }, [loadInsights])

  if (state.status === 'loading') return <p className="text-sm text-ink/70">Cargando tu resumen…</p>

  if (state.status === 'error') {
    return (
      <p role="alert" className="rounded-xl bg-white p-4 text-sm text-red-700 shadow-sm">
        {state.message}
      </p>
    )
  }

  const { insights } = state
  const dayFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone })

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card title="Clases realizadas">
            <p className="text-4xl font-semibold text-ocean">{insights.lessonsCount}</p>
          </Card>
          <Card title="Refuerzos resueltos">
            <p className="text-4xl font-semibold text-ocean">{insights.completedMaterials}</p>
          </Card>
          <Card title="Nota media">
            {insights.averageScore === null ? (
              <p className="text-sm text-ink/70">Sin refuerzos resueltos</p>
            ) : (
              <p className="text-4xl font-semibold text-ocean">{formatScore(insights.averageScore)}</p>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card title="Refuerzos pendientes">
            {insights.pendingMaterials.length === 0 ? (
              <p className="text-sm text-ink/70">No tienes refuerzos pendientes.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {insights.pendingMaterials.map((pending) => (
                  <li key={pending.lessonId} className="flex items-center justify-between gap-3 rounded-lg bg-mist px-3 py-2">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold text-ink">{pending.topic}</span>
                      <span className="text-xs text-ink/70">
                        {formatDate(pending.date)} · {pending.exerciseCount} {pending.exerciseCount === 1 ? 'pregunta' : 'preguntas'}
                      </span>
                    </span>
                    <Link
                      to={studentLessonPath(pending.lessonId)}
                      aria-label={`Resolver el refuerzo de «${pending.topic}»`}
                      className="shrink-0 rounded-md bg-ocean px-3 py-1.5 text-sm font-medium text-white hover:bg-ink"
                    >
                      Resolver
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <Card title="Calendario de clases">
            <LessonCalendar
              lessons={insights.calendar.map(({ id, start, topic }) => ({ id, start, label: topic }))}
              today={today}
              timeZone={timeZone}
            />
          </Card>

          <Card title="Evolución de tu nota">
            {insights.scoreHistory.length === 0 ? (
              <p className="text-sm text-ink/70">Aún no has resuelto ningún refuerzo.</p>
            ) : (
              <BarChart
                title="Evolución de tu nota"
                labelHeader="Fecha"
                valueHeader="Nota"
                maxValue={100}
                formatValue={formatScore}
                data={insights.scoreHistory.map((point) => ({
                  label: dayFormat.format(new Date(point.submittedAt)).replace('.', ''),
                  value: point.score,
                }))}
              />
            )}
          </Card>
        </div>
      </div>

      {/* Como «Mis alumnos» en el panel del docente: columna lateral que se queda fija al desplazarse */}
      <aside aria-label="Actividad reciente" className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm lg:sticky lg:top-6">
        <h2 className="text-lg font-semibold text-ink">Actividad reciente</h2>
        {insights.recentActivity.length === 0 ? (
          <p className="text-sm text-ink/70">Aún no hay actividad.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {insights.recentActivity.map((activity) => {
              const type = ACTIVITY_TYPES[activity.type]
              return (
                <li key={activity.id} className="flex gap-3">
                  <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${type.style}`}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <path d={type.icon} />
                    </svg>
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ocean">{type.label}</span>
                    <span className="text-ink">{studentActivityDescription(activity)}</span>
                    <span className="text-xs text-ink/70">{formatDate(activity.date)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </aside>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-xs font-medium uppercase tracking-wide text-ink/70">{title}</h2>
      {children}
    </section>
  )
}
