import { useId, useState, type FormEvent } from 'react'
import type { Answer, ExerciseForStudent, StudentSubmission } from '../../domain/lesson'

interface AnswerFormProps {
  lessonId: string
  exercises: ExerciseForStudent[]
  submitMaterial: (lessonId: string, answers: Answer[]) => Promise<StudentSubmission>
  onSubmitted: (submission: StudentSubmission) => void
}

export function AnswerForm({ lessonId, exercises, submitMaterial, onSubmitted }: AnswerFormProps) {
  const id = useId()
  // Opción elegida por id de ejercicio
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [showMissing, setShowMissing] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const missing = exercises.filter((exercise) => !(exercise.id in selected))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    if (missing.length > 0) {
      setShowMissing(true)
      return
    }

    setIsSubmitting(true)
    try {
      const answers = exercises.map((exercise) => ({ exerciseId: exercise.id, selectedOption: selected[exercise.id] }))
      onSubmitted(await submitMaterial(lessonId, answers))
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudieron enviar las respuestas')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <ol className="flex list-decimal flex-col gap-5 pl-5">
        {exercises.map((exercise) => {
          const sentenceId = `${id}-exercise-${exercise.id}`
          const isMissing = showMissing && !(exercise.id in selected)
          return (
            <li key={exercise.id}>
              <div
                role="radiogroup"
                aria-labelledby={sentenceId}
                aria-invalid={isMissing || undefined}
                className="flex flex-col gap-2"
              >
                <span id={sentenceId} className="text-gray-900">
                  {exercise.sentence}
                </span>
                <span className="flex flex-wrap gap-2">
                  {exercise.options.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-3 py-1.5 text-sm has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50"
                    >
                      <input
                        type="radio"
                        name={sentenceId}
                        value={option}
                        checked={selected[exercise.id] === option}
                        onChange={() => setSelected((current) => ({ ...current, [exercise.id]: option }))}
                      />
                      {option}
                    </label>
                  ))}
                </span>
                {isMissing && <span className="text-sm text-red-600">Falta responder este ejercicio</span>}
              </div>
            </li>
          )
        })}
      </ol>

      {showMissing && missing.length > 0 && (
        <p className="text-sm text-red-600">Responde todos los ejercicios antes de enviar</p>
      )}

      {submitError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Enviando…' : 'Enviar respuestas'}
      </button>
    </form>
  )
}
