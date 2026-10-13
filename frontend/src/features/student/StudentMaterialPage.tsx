import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Answer, ExerciseResult, StudentMaterial, StudentSubmission } from '../../domain/lesson'
import { homePathFor } from '../../routes/paths'
import { AnswerForm } from './AnswerForm'

interface StudentMaterialPageProps {
  lessonId: string
  // Debe ser una referencia estable: cada cambio vuelve a cargar el material
  loadMaterial: (lessonId: string) => Promise<StudentMaterial>
  submitMaterial: (lessonId: string, answers: Answer[]) => Promise<StudentSubmission>
}

type MaterialState =
  | { status: 'loading' }
  | { status: 'loaded'; material: StudentMaterial }
  | { status: 'error'; message: string }

const scoreFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })

export function StudentMaterialPage({ lessonId, loadMaterial, submitMaterial }: StudentMaterialPageProps) {
  const [state, setState] = useState<MaterialState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadMaterial(lessonId).then(
      (material) => active && setState({ status: 'loaded', material }),
      (error: unknown) =>
        active &&
        setState({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar el material' }),
    )
    return () => {
      active = false
    }
  }, [lessonId, loadMaterial])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link to={homePathFor('estudiante')} className="self-start text-sm font-medium text-blue-600 hover:text-blue-800">
        ← Volver a mis clases
      </Link>

      {state.status === 'loading' && <p className="text-sm text-gray-500">Cargando material…</p>}

      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && (
        <MaterialView
          material={state.material}
          submitMaterial={submitMaterial}
          onSubmitted={(submission) => setState({ status: 'loaded', material: { ...state.material, submission } })}
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

  return (
    <>
      <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
        <header className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">Material de refuerzo</p>
          <h1 className="text-2xl font-semibold text-gray-900">{material.title}</h1>
        </header>
        <p className="text-gray-700">{material.instructions}</p>
        {submission ? (
          <CorrectedExercises material={material} submission={submission} />
        ) : (
          <AnswerForm
            lessonId={material.lessonId}
            exercises={material.exercises}
            submitMaterial={submitMaterial}
            onSubmitted={onSubmitted}
          />
        )}
      </section>

      {submission && <SubmissionResult submission={submission} />}
    </>
  )
}

function CorrectedExercises({ material, submission }: { material: StudentMaterial; submission: StudentSubmission }) {
  const resultsById = new Map(submission.results.map((result) => [result.exerciseId, result]))

  return (
    <ol aria-label="Ejercicios" className="flex list-decimal flex-col gap-4 pl-5">
      {material.exercises.map((exercise) => {
        const result = resultsById.get(exercise.id)
        return (
          <li key={exercise.id} className="flex flex-col gap-1">
            <span className="text-gray-900">{exercise.sentence}</span>
            <span className="flex flex-wrap gap-2 text-sm">
              {exercise.options.map((option) => (
                <span key={option} className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">
                  {option}
                </span>
              ))}
            </span>
            {result && <ExerciseOutcome result={result} />}
          </li>
        )
      })}
    </ol>
  )
}

function ExerciseOutcome({ result }: { result: ExerciseResult }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          result.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {result.isCorrect ? 'Correcto' : 'Incorrecto'}
      </span>
      <span className="text-gray-700">Tu respuesta: {result.selectedOption}</span>
      {!result.isCorrect && <span className="text-gray-700">· Respuesta correcta: {result.correctOption}</span>}
    </span>
  )
}

function SubmissionResult({ submission }: { submission: StudentSubmission }) {
  return (
    <section aria-label="Tu resultado" className="flex flex-col gap-3 rounded-xl bg-white p-6 shadow-md">
      <h2 className="text-lg font-semibold text-gray-900">Tu resultado</h2>
      <p className="text-3xl font-semibold text-gray-900">{scoreFormat.format(submission.score)} %</p>
      <p className="text-sm text-gray-500">
        {submission.correctCount} correctas · {submission.incorrectCount} incorrectas
      </p>
      <p className="text-gray-700">{submission.feedback}</p>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Recomendaciones</h3>
      <ul aria-label="Recomendaciones" className="flex list-disc flex-col gap-1 pl-5 text-gray-700">
        {submission.recommendations.map((recommendation) => (
          <li key={recommendation}>{recommendation}</li>
        ))}
      </ul>
    </section>
  )
}
