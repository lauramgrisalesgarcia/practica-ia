import { useEffect, useId, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { formatDate } from '@/shared/i18n/formatDate'
import type { LessonDetail, LessonPdf, MaterialRequest, SubmissionSummary, TeacherMaterial } from '@/domain/lesson'
import { GENERATE_MATERIAL_ANCHOR, studentDetailPath } from '@/shared/routes/paths'
import { GenerateMaterialForm } from './components/GenerateMaterialForm'
import { PdfDownloadButton } from '@/shared/components/PdfDownloadButton'

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

  // El enlace «Generar material» del historial llega con el ancla del formulario,
  // que solo existe cuando la clase ya está cargada
  const { hash } = useLocation()
  const isLoaded = state.status === 'loaded'
  useEffect(() => {
    if (isLoaded && hash === `#${GENERATE_MATERIAL_ANCHOR}`) {
      document.getElementById(GENERATE_MATERIAL_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isLoaded, hash])

  if (state.status === 'loading') {
    return <p className="mx-auto max-w-2xl text-sm text-ink/70">Cargando clase…</p>
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
        className="self-start text-sm font-medium text-ocean hover:text-ink"
      >
        ← Volver a {lesson.student.name}
      </Link>

      <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-ink">{lesson.topic}</h1>
          <p className="text-sm text-ink/70">
            {formatDate(lesson.date)} · {lesson.durationMinutes} min
          </p>
        </header>
        <p className="text-ink/80">{lesson.context}</p>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/70">Palabras clave</h2>
          <ul aria-label="Palabras clave" className="flex flex-wrap gap-2">
            {lesson.keywords.map((keyword) => (
              <li key={keyword} className="rounded-full bg-mist px-2 py-0.5 text-sm text-ocean">
                {keyword}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/70">Notas</h2>
          <p className="text-ink/80">{lesson.notes ?? 'Sin notas.'}</p>
        </div>

        <PdfDownloadButton lessonId={lesson.id} filename={lesson.pdfFilename} downloadPdf={downloadPdf} openPdf={openPdf} />
      </section>

      {lesson.material ? (
        <MaterialSection material={lesson.material} />
      ) : (
        <p className="rounded-xl bg-white p-6 text-sm text-ink/70 shadow-md">
          Aún no se ha generado material de refuerzo para esta clase.
        </p>
      )}

      {lesson.material &&
        (lesson.submission ? (
          <SubmissionSection submission={lesson.submission} />
        ) : (
          <p className="rounded-xl bg-white p-6 text-sm text-ink/70 shadow-md">
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

function MaterialSection({ material }: { material: TeacherMaterial }) {
  const correctAnswerId = useId()

  return (
    <section aria-label="Material de refuerzo" className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
      <p className="text-sm font-semibold uppercase tracking-wide text-ink/70">Material de refuerzo</p>
      <h2 className="text-lg font-semibold text-ink">{material.title}</h2>
      <p className="text-ink/80">{material.instructions}</p>
      <span id={correctAnswerId} hidden>
        Respuesta correcta
      </span>
      <ol className="flex list-decimal flex-col gap-3 pl-5">
        {material.exercises.map((exercise) => (
          <li key={exercise.id} className="flex flex-col gap-1">
            <span className="text-ink">{exercise.sentence}</span>
            <span className="flex flex-wrap gap-2 text-sm">
              {exercise.options.map((option) =>
                option === exercise.correctOption ? (
                  <span
                    key={option}
                    aria-describedby={correctAnswerId}
                    className="rounded-md bg-mint px-2 py-0.5 font-medium text-ink"
                  >
                    {option}
                  </span>
                ) : (
                  <span key={option} className="rounded-md bg-mist px-2 py-0.5 text-ink/80">
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
      <h2 className="text-lg font-semibold text-ink">Resultado del alumno</h2>
      <p className="text-3xl font-semibold text-ink">{submission.score} %</p>
      <p className="text-sm text-ink/70">
        {submission.correctCount} correctas · {submission.incorrectCount} incorrectas · resuelto el{' '}
        {formatDate(submission.submittedAt)}
      </p>
    </section>
  )
}
