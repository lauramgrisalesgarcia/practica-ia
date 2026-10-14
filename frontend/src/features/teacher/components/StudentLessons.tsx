import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatDate } from '@/shared/i18n/formatDate'
import type { LessonSummary, MaterialStatus } from '@/domain/lesson'
import { lessonDetailPath } from '@/shared/routes/paths'

interface StudentLessonsProps {
  studentId: string
  // Debe ser una referencia estable: cada cambio vuelve a cargar el historial
  loadLessons: (studentId: string) => Promise<LessonSummary[]>
}

type LessonsState =
  | { status: 'loading' }
  | { status: 'loaded'; lessons: LessonSummary[] }
  | { status: 'error'; message: string }

const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  none: 'Sin material',
  pending: 'Material pendiente',
  completed: 'Material resuelto',
}

const MATERIAL_STATUS_STYLES: Record<MaterialStatus, string> = {
  none: 'bg-mist text-ink/80',
  pending: 'bg-teal/20 text-ocean',
  completed: 'bg-mint text-ink',
}

export function StudentLessons({ studentId, loadLessons }: StudentLessonsProps) {
  const [state, setState] = useState<LessonsState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadLessons(studentId).then(
      (lessons) => active && setState({ status: 'loaded', lessons }),
      (error: unknown) =>
        active &&
        setState({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar el historial' }),
    )
    return () => {
      active = false
    }
  }, [studentId, loadLessons])

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
      <h2 className="text-lg font-semibold text-ink">Historial de clases</h2>

      {state.status === 'loading' && <p className="text-sm text-ink/70">Cargando clases…</p>}

      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && state.lessons.length === 0 && (
        <p className="text-sm text-ink/70">Este alumno aún no tiene clases realizadas.</p>
      )}

      {state.status === 'loaded' && state.lessons.length > 0 && (
        <ul aria-label="Historial de clases" className="divide-y divide-mist">
          {state.lessons.map((lesson) => (
            <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="flex flex-col">
                <Link to={lessonDetailPath(lesson.id)} className="font-medium text-ocean hover:underline">
                  {lesson.topic}
                </Link>
                <span className="text-sm text-ink/70">
                  <time dateTime={lesson.date}>{formatDate(lesson.date)}</time> ·{' '}
                  {lesson.durationMinutes} min
                </span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${MATERIAL_STATUS_STYLES[lesson.materialStatus]}`}>
                {MATERIAL_STATUS_LABELS[lesson.materialStatus]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
