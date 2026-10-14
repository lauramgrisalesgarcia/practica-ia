import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import type { Answer, ExerciseForStudent, StudentSubmission } from '@/domain/lesson'

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
      setSubmitError(error instanceof Error ? error.message : 'No se pudieron enviar las respuestas')
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
      <span
        className={`mx-1 inline-block min-w-20 border-b-2 border-ink/30 px-2 font-semibold ${choice ? 'text-ocean' : 'text-ink/30'}`}
      >
        {choice ?? BLANK}
      </span>
      {rest.join(BLANK)}
    </>
  )
}

interface OptionWheelProps {
  options: string[]
  value: string | undefined
  onChange: (option: string) => void
}

const ITEM_HEIGHT = 56
// Tiempo sin desplazarse para dar por elegida la opción centrada
const SCROLL_SETTLE_MS = 120

// Selector de rueda: se elige deslizando (la opción centrada), tocando una opción o con las flechas
function OptionWheel({ options, value, onChange }: OptionWheelProps) {
  const id = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const settleTimer = useRef<number | undefined>(undefined)
  // Desplazamientos hechos por código: no deben cambiar la respuesta
  const isScrollingByCode = useRef(false)
  const selectedIndex = value === undefined ? -1 : options.indexOf(value)

  function scrollToIndex(index: number, behavior: ScrollBehavior) {
    const list = listRef.current
    if (!list) return
    markScrollingByCode()
    if (typeof list.scrollTo === 'function') list.scrollTo({ top: index * ITEM_HEIGHT, behavior })
    else list.scrollTop = index * ITEM_HEIGHT
  }

  // Si el desplazamiento por código no llega a mover la rueda no hay evento de scroll: se libera igualmente
  function markScrollingByCode() {
    isScrollingByCode.current = true
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => {
      isScrollingByCode.current = false
    }, 600)
  }

  // Al volver a una pregunta respondida, centra su respuesta (solo al montar la rueda de cada pregunta)
  const initialIndex = useRef(selectedIndex)
  useEffect(() => {
    const list = listRef.current
    if (list && initialIndex.current >= 0) {
      markScrollingByCode()
      list.scrollTop = initialIndex.current * ITEM_HEIGHT
    }
    const timer = settleTimer
    return () => window.clearTimeout(timer.current)
  }, [])

  function select(index: number) {
    onChange(options[index])
    scrollToIndex(index, 'smooth')
  }

  function handleScroll() {
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => {
      const list = listRef.current
      // Al terminar un desplazamiento hecho por código, la respuesta ya está elegida
      if (isScrollingByCode.current || !list) {
        isScrollingByCode.current = false
        return
      }
      const index = Math.min(options.length - 1, Math.max(0, Math.round(list.scrollTop / ITEM_HEIGHT)))
      if (options[index] !== value) onChange(options[index])
    }, SCROLL_SETTLE_MS)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    const next = selectedIndex === -1 ? 0 : Math.min(options.length - 1, Math.max(0, selectedIndex + step))
    select(next)
  }

  return (
    <div className="relative">
      <ul
        ref={listRef}
        role="listbox"
        aria-label="Opciones"
        tabIndex={0}
        aria-activedescendant={selectedIndex >= 0 ? `${id}-option-${selectedIndex}` : undefined}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        className="h-[168px] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-2xl py-14 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-teal"
      >
        {options.map((option, index) => {
          const isSelected = index === selectedIndex
          return (
            <li
              key={option}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={isSelected}
              onClick={() => select(index)}
              className={`mx-1 flex h-14 cursor-pointer snap-center items-center justify-center rounded-2xl border-2 text-xl transition-colors ${
                isSelected
                  ? 'border-teal bg-mist font-semibold text-ocean'
                  : 'border-transparent text-ocean/50 hover:text-ocean'
              }`}
            >
              {option}
            </li>
          )
        })}
      </ul>
      {/* Degradados que dan sensación de rueda */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-10 rounded-t-2xl bg-gradient-to-b from-white to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-2xl bg-gradient-to-t from-white to-transparent" />
      {selectedIndex === -1 && (
        <p className="mt-2 text-center text-xs text-ink/70">Desliza o toca una opción para elegirla</p>
      )}
    </div>
  )
}
