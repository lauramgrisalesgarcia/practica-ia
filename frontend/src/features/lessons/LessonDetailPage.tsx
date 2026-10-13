import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { formatDate } from '../../i18n/formatDate'
import type { LessonDetail, LessonPdf, MaterialRequest, SubmissionSummary, TeacherMaterial } from '../../domain/lesson'
import { studentDetailPath } from '../../routes/paths'
import { GenerateMaterialForm } from './GenerateMaterialForm'

interface LessonDetailPageProps {
  lessonId: string
  // Deben ser referencias estables: cada cambio de loadLesson vuelve a cargar la clase
  loadLesson: (lessonId: string) => Promise<LessonDetail>
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  // Muestra al usuario el PDF descargado
  openPdf: (pdf: LessonPdf) => void
  generateMaterial: (lessonId: string, request: MaterialRequest) => Promise<TeacherMaterial>
}

type LessonState =
  | { status: 'loading' }
  | { status: 'loaded'; lesson: LessonDetail }
  | { status: 'error'; message: string }

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function LessonDetailPage({ lessonId, loadLesson, downloadPdf, openPdf, generateMaterial }: LessonDetailPageProps) {
  const [state, setState] = useState<LessonState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadLesson(lessonId).then(
      (lesson) => active && setState({ status: 'loaded', lesson }),
      (error: unknown) => active && setState({ status: 'error', message: errorMessage(error, 'No se pudo cargar la clase') }),
    )
    return () => {
      active = false
    }
  }, [lessonId, loadLesson])

  if (state.status === 'loading') {
    return <p className="mx-auto max-w-2xl text-sm text-gray-500">Cargando clase…</p>
  }

  if (state.status === 'error') {
    return (
      <p role="alert" className="mx-auto max-w-2xl rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.message}
      </p>
    )
  }

  const { lesson } = state

  function handleGenerated(material: TeacherMaterial) {
    setState({ status: 'loaded', lesson: { ...lesson, material, materialStatus: 'pending' } })
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        to={studentDetailPath(lesson.student.id)}
        className="self-start text-sm font-medium text-blue-600 hover:text-blue-800"
      >
        ← Volver a {lesson.student.name}
      </Link>

      <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-gray-900">{lesson.topic}</h1>
          <p className="text-sm text-gray-500">
            {formatDate(lesson.date)} · {lesson.durationMinutes} min
          </p>
        </header>
        <p className="text-gray-700">{lesson.context}</p>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Palabras clave</h2>
          <ul aria-label="Palabras clave" className="flex flex-wrap gap-2">
            {lesson.keywords.map((keyword) => (
              <li key={keyword} className="rounded-full bg-blue-50 px-2 py-0.5 text-sm text-blue-800">
                {keyword}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Notas</h2>
          <p className="text-gray-700">{lesson.notes ?? 'Sin notas.'}</p>
        </div>

        <PdfDownload lessonId={lesson.id} filename={lesson.pdfFilename} downloadPdf={downloadPdf} openPdf={openPdf} />
      </section>

      {lesson.material ? (
        <MaterialSection material={lesson.material} />
      ) : (
        <p className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-md">
          Aún no se ha generado material de refuerzo para esta clase.
        </p>
      )}

      {lesson.material &&
        (lesson.submission ? (
          <SubmissionSection submission={lesson.submission} />
        ) : (
          <p className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-md">
            El alumno aún no ha resuelto el material.
          </p>
        ))}

      {!lesson.submission && (
        <GenerateMaterialForm
          lessonId={lesson.id}
          initialKeywords={lesson.keywords}
          hasMaterial={lesson.material !== null}
          generateMaterial={generateMaterial}
          onGenerated={handleGenerated}
        />
      )}
    </div>
  )
}

interface PdfDownloadProps {
  lessonId: string
  filename: string
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  openPdf: (pdf: LessonPdf) => void
}

function PdfDownload({ lessonId, filename, downloadPdf, openPdf }: PdfDownloadProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setError(null)
    setIsDownloading(true)
    try {
      openPdf(await downloadPdf(lessonId))
    } catch (downloadError) {
      setError(errorMessage(downloadError, 'No se pudo descargar el PDF'))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isDownloading ? 'Descargando…' : `Descargar PDF (${filename})`}
      </button>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

function MaterialSection({ material }: { material: TeacherMaterial }) {
  const correctAnswerId = useId()

  return (
    <section aria-label="Material de refuerzo" className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
      <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">Material de refuerzo</p>
      <h2 className="text-lg font-semibold text-gray-900">{material.title}</h2>
      <p className="text-gray-700">{material.instructions}</p>
      <span id={correctAnswerId} hidden>
        Respuesta correcta
      </span>
      <ol className="flex list-decimal flex-col gap-3 pl-5">
        {material.exercises.map((exercise) => (
          <li key={exercise.id} className="flex flex-col gap-1">
            <span className="text-gray-900">{exercise.sentence}</span>
            <span className="flex flex-wrap gap-2 text-sm">
              {exercise.options.map((option) =>
                option === exercise.correctOption ? (
                  <span
                    key={option}
                    aria-describedby={correctAnswerId}
                    className="rounded-md bg-green-100 px-2 py-0.5 font-medium text-green-800"
                  >
                    {option}
                  </span>
                ) : (
                  <span key={option} className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">
                    {option}
                  </span>
                ),
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function SubmissionSection({ submission }: { submission: SubmissionSummary }) {
  return (
    <section aria-label="Resultado del alumno" className="flex flex-col gap-2 rounded-xl bg-white p-6 shadow-md">
      <h2 className="text-lg font-semibold text-gray-900">Resultado del alumno</h2>
      <p className="text-3xl font-semibold text-gray-900">{submission.score} %</p>
      <p className="text-sm text-gray-500">
        {submission.correctCount} correctas · {submission.incorrectCount} incorrectas · resuelto el{' '}
        {formatDate(submission.submittedAt)}
      </p>
    </section>
  )
}
