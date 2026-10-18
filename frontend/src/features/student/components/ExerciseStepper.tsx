import { useState } from 'react'
import type { Answer, ExerciseForStudent, StudentSubmission } from '@/domain/lesson'
import { errorMessage } from '@/shared/errors/errorMessage'
import { OptionWheel } from './OptionWheel'

interface ExerciseStepperProps {
  lessonId: string
  exercises: ExerciseForStudent[]
  submitMaterial: (lessonId: string, answers: Answer[]) => Promise<StudentSubmission>
  onSubmitted: (submission: StudentSubmission) => void
}

const BLANK = '___'

// Resuelve el refuerzo pregunta a pregunta; las respuestas se envían juntas al final (un único intento)
export function ExerciseStepper({ lessonId, exercises, submitMaterial, onSubmitted }: ExerciseStepperProps) {
  const [current, setCurrent] = useState(0)
  // Opción elegida por id de ejercicio
  const [selected, setSelected] = useState<Record<number, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const exercise = exercises[current]
  const choice = selected[exercise.id]
  const isLast = current === exercises.length - 1

  async function handleSubmit() {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const answers = exercises.map(({ id }) => ({ exerciseId: id, selectedOption: selected[id] }))
      onSubmitted(await submitMaterial(lessonId, answers))
    } catch (error) {
      setSubmitError(errorMessage(error, 'No se pudieron enviar las respuestas'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ocean">
          Pregunta {current + 1} de {exercises.length}
        </p>
        <div
          role="progressbar"
          aria-label="Progreso"
          aria-valuemin={1}
          aria-valuemax={exercises.length}
          aria-valuenow={current + 1}
          className="h-2.5 w-full overflow-hidden rounded-full bg-mist"
        >
          <div
            className="h-full rounded-full bg-teal transition-all duration-300"
            style={{ width: `${((current + 1) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      <section
        aria-label={`Pregunta ${current + 1}`}
        className="flex min-h-32 items-center justify-center rounded-3xl border-2 border-ink/10 bg-white px-6 py-8 text-center"
      >
        <p className="text-2xl leading-relaxed text-ink">
          <Sentence text={exercise.sentence} choice={choice} />
        </p>
      </section>

      <OptionWheel
        key={exercise.id}
        options={exercise.options}
        value={choice}
        onChange={(option) => setSelected((answers) => ({ ...answers, [exercise.id]: option }))}
      />

      {submitError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex gap-3">
        {current > 0 && (
          <button
            type="button"
            onClick={() => setCurrent((index) => index - 1)}
            disabled={isSubmitting}
            className="rounded-xl border-2 border-ink/15 px-5 py-3 font-semibold text-ocean hover:bg-mist disabled:opacity-50"
          >
            Anterior
          </button>
        )}
        <button
          type="button"
          onClick={isLast ? handleSubmit : () => setCurrent((index) => index + 1)}
          disabled={choice === undefined || isSubmitting}
          className="flex-1 rounded-xl bg-ocean px-5 py-3 font-semibold uppercase tracking-wide text-white shadow-[0_4px_0_0] shadow-ink hover:bg-ink disabled:bg-ink/20 disabled:text-ink/50 disabled:shadow-none"
        >
          {isSubmitting ? 'Enviando…' : isLast ? 'Enviar respuestas' : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}

// Frase con el hueco relleno con la opción elegida
function Sentence({ text, choice }: { text: string; choice: string | undefined }) {
  const [before, ...rest] = text.split(BLANK)
  return (
    <>
      {before}
      {/* El hueco es la línea: sin «___», que se vería doble */}
      <span className="mx-1 inline-block h-[1.4em] min-w-20 border-b-2 border-ink/30 px-2 align-bottom font-semibold text-ocean">
        {choice ?? <span className="sr-only">espacio en blanco</span>}
      </span>
      {rest.join(BLANK)}
    </>
  )
}
