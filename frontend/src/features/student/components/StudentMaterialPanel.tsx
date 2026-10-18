import { useEffect, useId, useRef, useState } from 'react'
import type { Answer, StudentMaterial, StudentSubmission } from '@/domain/lesson'
import { ExerciseStepper } from './ExerciseStepper'
import { errorMessage } from '@/shared/errors/errorMessage'
import { BlankSentence } from '@/shared/components/BlankSentence'

interface StudentMaterialPanelProps {
  lessonId: string
  // Debe ser una referencia estable: cada cambio vuelve a cargar el material
  loadMaterial: (lessonId: string) => Promise<StudentMaterial>
  submitMaterial: (lessonId: string, answers: Answer[]) => Promise<StudentSubmission>
  // Avisa a la página del resultado: al cargar un material ya resuelto y al resolverlo
  onResult?: (submission: StudentSubmission) => void
}

type MaterialState =
  | { status: 'loading' }
  | { status: 'loaded'; material: StudentMaterial }
  | { status: 'error'; message: string }

// Refuerzo de una clase: el formulario para resolverlo o, si ya está resuelto, la corrección y el resultado
export function StudentMaterialPanel({ lessonId, loadMaterial, submitMaterial, onResult }: StudentMaterialPanelProps) {
  const [state, setState] = useState<MaterialState>({ status: 'loading' })
  // Referencia al último aviso: cambiarlo no debe volver a cargar el material
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  })

  useEffect(() => {
    let active = true
    loadMaterial(lessonId).then(
      (material) => {
        if (!active) return
        setState({ status: 'loaded', material })
        if (material.submission) onResultRef.current?.(material.submission)
      },
      (error: unknown) =>
        active &&
        setState({ status: 'error', message: errorMessage(error, 'No se pudo cargar el material') }),
    )
    return () => {
      active = false
    }
  }, [lessonId, loadMaterial])

  return (
    <div className="flex flex-col gap-6">
      {state.status === 'loading' && <p className="text-sm text-ink/70">Cargando material…</p>}

      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && (
        <MaterialView
          material={state.material}
          submitMaterial={submitMaterial}
          onSubmitted={(submission) => {
            setState({ status: 'loaded', material: { ...state.material, submission } })
            onResult?.(submission)
          }}
        />
      )}
    </div>
  )
}

interface MaterialViewProps {
  material: StudentMaterial
  submitMaterial: (lessonId: string, answers: Answer[]) => Promise<StudentSubmission>
  onSubmitted: (submission: StudentSubmission) => void
}

function MaterialView({ material, submitMaterial, onSubmitted }: MaterialViewProps) {
  const { submission } = material
  const [isSolving, setIsSolving] = useState(false)
  const count = material.exercises.length

  return (
    <>
      <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
        <header className="flex flex-col gap-1">
          <p className="text-sm text-ink/70">Material de refuerzo</p>
          <h2 className="text-xl font-semibold text-ink">{material.title}</h2>
        </header>
        <p className="text-ink/80">{material.instructions}</p>
        {submission && (
          <>
            <ResultSummary submission={submission} />
            <CorrectedExercises material={material} submission={submission} />
          </>
        )}
        {!submission && isSolving && (
          <ExerciseStepper
            lessonId={material.lessonId}
            exercises={material.exercises}
            submitMaterial={submitMaterial}
            onSubmitted={onSubmitted}
          />
        )}
        {!submission && !isSolving && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-mist px-4 py-3">
            <p className="text-sm font-medium text-ink">
              {count} {count === 1 ? 'pregunta' : 'preguntas'}
            </p>
            <button
              type="button"
              aria-expanded={false}
              onClick={() => setIsSolving(true)}
              className="rounded-xl bg-ocean px-5 py-2.5 font-semibold text-white shadow-[0_4px_0_0] shadow-ink hover:bg-ink"
            >
              Resolver refuerzo
            </button>
          </div>
        )}
      </section>

    </>
  )
}

// Resumen del resultado, antes de las preguntas (la nota ya se ve arriba, junto a la clase)
function ResultSummary({ submission }: { submission: StudentSubmission }) {
  return (
    <section aria-label="Resumen del resultado" className="flex flex-col gap-3 rounded-xl bg-mist p-4">
      <p className="flex flex-wrap gap-2 text-sm font-semibold">
        <span className="rounded-full bg-mint px-3 py-1 text-ink">{submission.correctCount} correctas</span>{' '}
        <span className="sr-only">·</span>{' '}
        <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">{submission.incorrectCount} incorrectas</span>
      </p>
      <p className="text-ink/80">{submission.feedback}</p>
      <div className="flex flex-col gap-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/70">Recomendaciones</h3>
        <ul aria-label="Recomendaciones" className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink/80">
          {submission.recommendations.map((recommendation) => (
            <li key={recommendation}>{recommendation}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

// Preguntas corregidas, en tarjetas como las ve el docente
function CorrectedExercises({ material, submission }: { material: StudentMaterial; submission: StudentSubmission }) {
  const id = useId()
  const resultsById = new Map(submission.results.map((result) => [result.exerciseId, result]))
  const descriptions = {
    correct: `${id}-correct`,
    yoursRight: `${id}-yours-right`,
    yoursWrong: `${id}-yours-wrong`,
  }

  return (
    <>
      <span id={descriptions.correct} hidden>
        Respuesta correcta
      </span>
      <span id={descriptions.yoursRight} hidden>
        Tu respuesta, correcta
      </span>
      <span id={descriptions.yoursWrong} hidden>
        Tu respuesta, incorrecta
      </span>
      <ol aria-label="Ejercicios" className="flex flex-col gap-3">
        {material.exercises.map((exercise, index) => {
          const result = resultsById.get(exercise.id)
          const isCorrect = result?.isCorrect ?? false
          return (
            <li
              key={exercise.id}
              className={`flex flex-col gap-3 rounded-lg border p-4 ${
                isCorrect ? 'border-ink/10 bg-mist/40' : 'border-red-200 bg-red-50/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ocean">Pregunta {index + 1}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isCorrect ? 'bg-mint text-ink' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {isCorrect ? 'Correcta' : 'Incorrecta'}
                </span>
              </div>
              <p className="text-ink">
                <BlankSentence text={exercise.sentence} />
              </p>
              <ul aria-label="Opciones" className="flex flex-wrap gap-2 text-sm">
                {exercise.options.map((option) => {
                  const isRight = option === result?.correctOption
                  const isMine = option === result?.selectedOption
                  if (isMine && isRight) {
                    return (
                      <li key={option} className="flex items-center gap-1.5 rounded-full border border-ocean bg-mint px-3 py-1 text-ink">
                        <Mark kind="right" />
                        <span aria-describedby={descriptions.yoursRight} className="font-medium">
                          {option}
                        </span>
                        <span className="text-xs text-ink/80">Tu respuesta</span>
                      </li>
                    )
                  }
                  if (isMine) {
                    return (
                      <li key={option} className="flex items-center gap-1.5 rounded-full border border-red-300 bg-red-100 px-3 py-1 text-red-800">
                        <Mark kind="wrong" />
                        <span aria-describedby={descriptions.yoursWrong} className="font-medium line-through">
                          {option}
                        </span>
                        <span className="text-xs">Tu respuesta</span>
                      </li>
                    )
                  }
                  if (isRight) {
                    return (
                      <li key={option} className="flex items-center gap-1.5 rounded-full border border-ocean bg-mint px-3 py-1 text-ink">
                        <Mark kind="right" />
                        <span aria-describedby={descriptions.correct} className="font-medium">
                          {option}
                        </span>
                        <span className="text-xs text-ink/80">Correcta</span>
                      </li>
                    )
                  }
                  return (
                    <li key={option} className="rounded-full border border-ink/15 bg-white px-3 py-1 text-ink/80">
                      {option}
                    </li>
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ol>
    </>
  )
}

function Mark({ kind }: { kind: 'right' | 'wrong' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d={kind === 'right' ? 'm5 12 5 5 9-10' : 'M6 6l12 12M18 6 6 18'} />
    </svg>
  )
}
