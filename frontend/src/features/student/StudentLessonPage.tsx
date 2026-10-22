import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Answer, LessonPdf, StudentLessonSummary, StudentMaterial, StudentSubmission } from '@/domain/lesson'
import { PdfDownloadButton } from '@/shared/components/PdfDownloadButton'
import { formatDate } from '@/shared/i18n/formatDate'
import { STUDENT_LESSONS_PATH } from '@/shared/routes/paths'
import { formatScore } from '@/shared/i18n/formatScore'
import { StudentMaterialPanel } from './components/StudentMaterialPanel'
import { errorMessage } from '@/shared/errors/errorMessage'

interface StudentLessonPageProps {
  lessonId: string
  // Deben ser referencias estables: cada cambio vuelve a cargar la clase o el material
  loadLesson: (lessonId: string) => Promise<StudentLessonSummary>
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  openPdf: (pdf: LessonPdf) => void
  loadMaterial: (lessonId: string) => Promise<StudentMaterial>
  submitMaterial: (lessonId: string, answers: Answer[]) => Promise<StudentSubmission>
}

type LessonState =
  | { status: 'loading' }
  | { status: 'loaded'; lesson: StudentLessonSummary }
  | { status: 'error'; message: string }

// Clase del estudiante: sus datos (sin las notas del docente) y debajo el refuerzo
export function StudentLessonPage({
  lessonId,
  loadLesson,
  downloadPdf,
  openPdf,
  loadMaterial,
  submitMaterial,
}: StudentLessonPageProps) {
  const [state, setState] = useState<LessonState>({ status: 'loading' })
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    loadLesson(lessonId).then(
      (lesson) => active && setState({ status: 'loaded', lesson }),
      (error: unknown) =>
        active &&
        setState({ status: 'error', message: errorMessage(error, 'No se pudo cargar la clase') }),
    )
    return () => {
      active = false
    }
  }, [lessonId, loadLesson])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link to={STUDENT_LESSONS_PATH} className="self-start text-sm font-medium text-ocean hover:text-ink">
        ← Volver a mis clases
      </Link>

      {state.status === 'loading' && <p className="text-sm text-ink/70">Cargando clase…</p>}

      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && (
        <LessonView
          lesson={state.lesson}
          downloadPdf={downloadPdf}
          openPdf={openPdf}
          loadMaterial={loadMaterial}
          submitMaterial={submitMaterial}
          submittedAt={submittedAt}
          onResult={(submission) => {
            setSubmittedAt(submission.submittedAt)
            setState({
              status: 'loaded',
              lesson: { ...state.lesson, materialStatus: 'completed', score: submission.score },
            })
          }}
        />
      )}
    </div>
  )
}

interface LessonViewProps extends Omit<StudentLessonPageProps, 'lessonId' | 'loadLesson'> {
  lesson: StudentLessonSummary
  // Fecha en que resolvió el refuerzo: llega con el material, no con la clase
  submittedAt: string | null
  onResult: (submission: StudentSubmission) => void
}

function LessonView({ lesson, downloadPdf, openPdf, loadMaterial, submitMaterial, submittedAt, onResult }: LessonViewProps) {
  return (
    <>
      <div className={lesson.score !== null ? 'grid gap-6 md:grid-cols-[minmax(0,1fr)_10rem]' : 'flex flex-col'}>
        {lesson.score !== null && (
          <section
            aria-label="Tu nota"
            className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white p-5 text-center shadow-md md:order-last"
          >
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/70">Tu nota</h2>
            <p className="text-5xl font-semibold text-ocean">{formatScore(lesson.score)}</p>
            <p className="text-xs text-ink/70">del refuerzo</p>
            {submittedAt && (
              <p className="mt-3 w-full border-t border-cream pt-3 text-xs text-ink/70">Resuelto el {formatDate(submittedAt)}</p>
            )}
          </section>
        )}

        <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
          <header className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold text-ink">{lesson.topic}</h1>
              <p className="text-sm text-ink/70">
                {formatDate(lesson.date)} · {lesson.durationMinutes} min
              </p>
            </div>
            <div className="max-w-xs shrink-0">
              <PdfDownloadButton lessonId={lesson.id} filename={lesson.pdfFilename} downloadPdf={downloadPdf} openPdf={openPdf} />
            </div>
          </header>
          <p className="text-ink/80">{lesson.context}</p>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/70">Palabras clave</h2>
            <ul aria-label="Palabras clave" className="flex flex-wrap gap-2">
              {lesson.keywords.map((keyword) => (
                <li key={keyword} className="rounded-full bg-cream px-2 py-0.5 text-sm text-ocean">
                  {keyword}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {lesson.materialStatus === 'none' ? (
        <p className="rounded-xl bg-white p-6 text-sm text-ink/70 shadow-md">
          Tu docente aún no ha preparado el refuerzo de esta clase.
        </p>
      ) : (
        <StudentMaterialPanel
          lessonId={lesson.id}
          loadMaterial={loadMaterial}
          submitMaterial={submitMaterial}
          onResult={onResult}
        />
      )}
    </>
  )
}
