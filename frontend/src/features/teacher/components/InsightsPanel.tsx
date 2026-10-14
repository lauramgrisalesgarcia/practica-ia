import { useEffect, useState, type ReactNode } from 'react'
import type { ActivityType, TeacherInsights } from '@/domain/insights'
import { activityDescription } from './activityDescription'
import { BarChart } from '@/shared/components/charts/BarChart'
import { formatDate } from '@/shared/i18n/formatDate'
import { LessonCalendar } from '@/shared/components/LessonCalendar'

interface InsightsPanelProps {
  // Debe ser una referencia estable: cada cambio vuelve a cargar los indicadores
  loadInsights: () => Promise<TeacherInsights>
  today?: Date
  timeZone?: string
}

type InsightsState =
  | { status: 'loading' }
  | { status: 'loaded'; insights: TeacherInsights }
  | { status: 'error'; message: string }

// Etiqueta corta de semana (p. ej. «28 sept»); las fechas son días sin hora, en UTC
const weekFormat = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const weekLabel = (weekStart: string) => weekFormat.format(new Date(`${weekStart}T00:00:00Z`)).replace('.', '')

// Escala de un solo tono (ocean) de claro a oscuro: los estados son ordenados
const MATERIAL_STATUS = [
  { key: 'completed', label: 'Resuelto', color: 'bg-ocean' },
  { key: 'pending', label: 'Pendiente', color: 'bg-[#85a4af]' },
  { key: 'none', label: 'Sin material', color: 'bg-[#d3dee2]' },
] as const

// El tipo siempre lleva etiqueta de texto: el icono y el color solo la acompañan
const ACTIVITY_TYPES: Record<ActivityType, { label: string; icon: string; style: string }> = {
  submission: { label: 'Material resuelto', icon: 'M5 12l5 5L20 7', style: 'bg-mint text-ink' },
  material: { label: 'Material nuevo', icon: 'M12 5v14M5 12h14', style: 'bg-teal text-white' },
  lesson: { label: 'Clase', icon: 'M4 6h16M4 12h16M4 18h10', style: 'bg-ocean text-white' },
}

export function InsightsPanel({ loadInsights, today = new Date(), timeZone }: InsightsPanelProps) {
  const [state, setState] = useState<InsightsState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadInsights().then(
      (insights) => active && setState({ status: 'loaded', insights }),
      (error: unknown) =>
        active &&
        setState({ status: 'error', message: error instanceof Error ? error.message : 'No se pudieron cargar los indicadores' }),
    )
    return () => {
      active = false
    }
  }, [loadInsights])

  if (state.status === 'loading') return <p className="text-sm text-ink/70">Cargando indicadores…</p>

  if (state.status === 'error') {
    return (
      <p role="alert" className="rounded-xl bg-white p-4 text-sm text-red-700 shadow-sm">
        {state.message}
      </p>
    )
  }

  const { insights } = state
  const { materialStatus } = insights
  const totalMaterials = materialStatus.completed + materialStatus.pending + materialStatus.none

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-ink">Resumen de actividad</h2>
        {insights.isSample && (
          <span className="rounded-full border border-dashed border-ocean px-2.5 py-0.5 text-xs font-medium text-ocean">
            Datos de ejemplo
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Clases este mes">
          <p className="text-4xl font-semibold text-ocean">{insights.lessonsThisMonth}</p>
        </Card>
        <Card title="Materiales pendientes">
          <p className="text-4xl font-semibold text-ocean">{insights.pendingMaterials}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card title="Actividad reciente">
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
                    <span className="text-ink">
                      <span className="font-semibold">{activity.studentName}</span> {activityDescription(activity)}
                    </span>
                    <span className="text-xs text-ink/70">{formatDate(activity.date)}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card title="Calendario de clases">
          <LessonCalendar
            lessons={insights.calendar.map(({ id, start, studentName, topic }) => ({ id, start, label: `${studentName} · ${topic}` }))}
            today={today}
            timeZone={timeZone}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <Card title="Clases por semana">
          <BarChart
            title="Clases por semana"
            valueHeader="Clases"
            data={insights.weeklyLessons.map((week) => ({ label: weekLabel(week.weekStart), value: week.count }))}
          />
        </Card>
        <Card title="Estado del material">
          <div className="flex h-4 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
            {MATERIAL_STATUS.map(({ key, color }) => (
              <div
                key={key}
                className={color}
                style={{ width: `${totalMaterials ? (materialStatus[key] / totalMaterials) * 100 : 0}%` }}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {MATERIAL_STATUS.map(({ key, label, color }) => (
              <li key={key} className="flex items-center gap-2">
                <span aria-hidden="true" className={`h-3 w-3 rounded-sm ${color}`} />
                <span className="text-ink/80">{label}</span>
                <span className="font-semibold text-ink">{materialStatus[key]}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm">
      <h3 className="text-sm font-medium uppercase tracking-wide text-ink/70">{title}</h3>
      {children}
    </section>
  )
}
