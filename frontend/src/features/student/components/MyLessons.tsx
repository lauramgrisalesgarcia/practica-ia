import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { LessonPdf, MaterialStatus, StudentLessonSummary } from '../../../domain/lesson'
import { formatDate } from '../../../shared/i18n/formatDate'
import { studentLessonPath } from '../../../shared/routes/paths'
import { PdfDownloadButton } from '../../../shared/components/PdfDownloadButton'

interface MyLessonsProps {
  // Deben ser referencias estables: cada cambio de loadLessons vuelve a cargar las clases
  loadLessons: () => Promise<StudentLessonSummary[]>
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  openPdf: (pdf: LessonPdf) => void
}

type LessonsState =
  | { status: 'loading' }
  | { status: 'loaded'; lessons: StudentLessonSummary[] }
  | { status: 'error'; message: string }

const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  none: 'Sin material',
  pending: 'Material por resolver',
  completed: 'Material resuelto',
}

const MATERIAL_STATUS_STYLES: Record<MaterialStatus, string> = {
  none: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
}

export function MyLessons({ loadLessons, downloadPdf, openPdf }: MyLessonsProps) {
  const [state, setState] = useState<LessonsState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadLessons().then(
      (lessons) => active && setState({ status: 'loaded', lessons }),
      (error: unknown) =>
        active &&
        setState({ status: 'error', message: error instanceof Error ? error.message : 'No se pudieron cargar las clases' }),
    )
    return () => {
      active = false
    }
  }, [loadLessons])

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
      <h2 className="text-lg font-semibold text-gray-900">Mis clases</h2>

      {state.status === 'loading' && <p className="text-sm text-gray-500">Cargando clases…</p>}

      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && state.lessons.length === 0 && (
        <p className="text-sm text-gray-500">Aún no tienes clases realizadas.</p>
      )}

      {state.status === 'loaded' && state.lessons.length > 0 && (
        <ul aria-label="Mis clases" className="divide-y divide-gray-200">
          {state.lessons.map((lesson) => (
            <li key={lesson.id} className="flex flex-col gap-3 py-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-col">
                  {lesson.materialStatus === 'none' ? (
                    <span className="font-medium text-gray-900">{lesson.topic}</span>
                  ) : (
                    <Link to={studentLessonPath(lesson.id)} className="font-medium text-blue-700 hover:underline">
                      {lesson.topic}
                    </Link>
                  )}
                  <span className="text-sm text-gray-500">
                    <time dateTime={lesson.date}>{formatDate(lesson.date)}</time> · {lesson.durationMinutes} min
                  </span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${MATERIAL_STATUS_STYLES[lesson.materialStatus]}`}
                >
                  {MATERIAL_STATUS_LABELS[lesson.materialStatus]}
                </span>
              </div>
              <PdfDownloadButton
                lessonId={lesson.id}
                filename={lesson.pdfFilename}
                downloadPdf={downloadPdf}
                openPdf={openPdf}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
