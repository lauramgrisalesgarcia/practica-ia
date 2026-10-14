import { Fragment, useEffect, useId, useState } from 'react'
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

const scoreFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

export function LessonDetailPage({ lessonId, loadLesson, downloadPdf, openPdf, generateMaterial }: LessonDetailPageProps) {
  const [state, setState] = useState<LessonState>({ status: 'loading' })
  // El enlace «Generar material» del historial llega con el ancla del formulario: se abre ya desplegado
  const { hash } = useLocation()
  const [isConfiguring, setIsConfiguring] = useState(hash === `#${GENERATE_MATERIAL_ANCHOR}`)

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

  // El formulario solo existe cuando la clase ya está cargada
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
    setIsConfiguring(false)
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

      {/* Con resultado, en pantallas anchas va en una columna estrecha a la derecha de la clase;
          en el DOM va primero para que se lea antes que los datos de la clase */}
      <div className={lesson.submission ? 'grid gap-6 md:grid-cols-[minmax(0,1fr)_12rem]' : 'flex flex-col'}>
        {lesson.submission && <SubmissionSection submission={lesson.submission} />}

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
        </section>
      </div>

      {lesson.material ? (
        <>
          {!lesson.submission && (
            <p className="rounded-xl bg-white p-6 text-sm text-ink/70 shadow-md">El alumno aún no ha resuelto el material.</p>
          )}
          <MaterialSection material={lesson.material} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-6 shadow-md">
            <p className="text-sm text-ink/70">Aún no se ha generado material de refuerzo para esta clase.</p>
            <button
              type="button"
              aria-expanded={isConfiguring}
              aria-controls={GENERATE_MATERIAL_ANCHOR}
              onClick={() => setIsConfiguring((open) => !open)}
              className="rounded-md bg-ocean px-4 py-2 text-sm font-medium text-white hover:bg-ink"
            >
              Generar material de refuerzo
            </button>
          </div>
          {isConfiguring && (
            <GenerateMaterialForm
              lessonId={lesson.id}
              initialKeywords={lesson.keywords}
              generateMaterial={generateMaterial}
              onGenerated={handleGenerated}
              onCancel={() => setIsConfiguring(false)}
            />
          )}
        </>
      )}
    </div>
  )
}

function MaterialSection({ material }: { material: TeacherMaterial }) {
  const correctAnswerId = useId()

  return (
    <section aria-label="Material de refuerzo" className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-md">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/70">
          Material de refuerzo · {material.exercises.length} {material.exercises.length === 1 ? 'pregunta' : 'preguntas'}
        </p>
        <h2 className="text-lg font-semibold text-ink">{material.title}</h2>
        <p className="text-sm text-ink/80">{material.instructions}</p>
      </header>
      <span id={correctAnswerId} hidden>
        Respuesta correcta
      </span>
      <ol className="flex flex-col gap-3">
        {material.exercises.map((exercise, index) => (
          <li key={exercise.id} className="flex flex-col gap-3 rounded-lg border border-ink/10 bg-mist/40 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ocean">Pregunta {index + 1}</h3>
            <p className="text-ink">
              <Sentence text={exercise.sentence} />
            </p>
            <ul aria-label="Opciones" className="flex flex-wrap gap-2 text-sm">
              {exercise.options.map((option) =>
                option === exercise.correctOption ? (
                  <li
                    key={option}
                    className="flex items-center gap-1.5 rounded-full border border-ocean bg-mint px-3 py-1 text-ink"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5 9-10" />
                    </svg>
                    <span aria-describedby={correctAnswerId} className="font-medium">
                      {option}
                    </span>
                    <span className="text-xs text-ink/80">Correcta</span>
                  </li>
                ) : (
                  <li key={option} className="rounded-full border border-ink/15 bg-white px-3 py-1 text-ink/80">
                    {option}
                  </li>
                ),
              )}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  )
}

// Frase con el hueco («___») resaltado
function Sentence({ text }: { text: string }) {
  const parts = text.split('___')
  return parts.map((part, index) => (
    <Fragment key={index}>
      {part}
      {index < parts.length - 1 && <span className="font-semibold tracking-widest text-ocean">___</span>}
    </Fragment>
  ))
}

function SubmissionSection({ submission }: { submission: SubmissionSummary }) {
  return (
    <section
      aria-label="Resultado del alumno"
      className="flex flex-col gap-1 self-start rounded-xl bg-white p-5 shadow-md md:order-last"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/70">Resultado del alumno</h2>
      <p className="text-3xl font-semibold text-ocean">{scoreFormat.format(submission.score)} %</p>
      <p className="text-sm text-ink/80">
        {submission.correctCount} correctas · {submission.incorrectCount} incorrectas
      </p>
      <p className="text-xs text-ink/70">Resuelto el {formatDate(submission.submittedAt)}</p>
    </section>
  )
}
