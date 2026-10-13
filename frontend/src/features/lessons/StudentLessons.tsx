import { useEffect, useState } from 'react'
import type { LessonSummary, MaterialStatus } from '../../domain/lesson'

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
  none: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
}

const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'long' })

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
      <h2 className="text-lg font-semibold text-gray-900">Historial de clases</h2>

      {state.status === 'loading' && <p className="text-sm text-gray-500">Cargando clases…</p>}

      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && state.lessons.length === 0 && (
        <p className="text-sm text-gray-500">Este alumno aún no tiene clases realizadas.</p>
      )}

      {state.status === 'loaded' && state.lessons.length > 0 && (
        <ul aria-label="Historial de clases" className="divide-y divide-gray-200">
          {state.lessons.map((lesson) => (
            <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">{lesson.topic}</span>
                <span className="text-sm text-gray-500">
                  <time dateTime={lesson.date}>{dateFormat.format(new Date(lesson.date))}</time> ·{' '}
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
