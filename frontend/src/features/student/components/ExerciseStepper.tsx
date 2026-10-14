import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
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
      {/* El hueco es la línea: sin «___», que se vería doble */}
      <span className="mx-1 inline-block h-[1.4em] min-w-20 border-b-2 border-ink/30 px-2 align-bottom font-semibold text-ocean">
        {choice ?? <span className="sr-only">espacio en blanco</span>}
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

  // Al montar la rueda de cada pregunta centra su respuesta o, si aún no tiene, la opción del medio,
  // para que se vean todas las opciones (sin elegir ninguna)
  const initialIndex = useRef(selectedIndex >= 0 ? selectedIndex : Math.floor((options.length - 1) / 2))
  useEffect(() => {
    const list = listRef.current
    if (list && initialIndex.current > 0) {
      markScrollingByCode()
      list.scrollTop = initialIndex.current * ITEM_HEIGHT
    }
    const timer = settleTimer
    return () => window.clearTimeout(timer.current)
  }, [])

  // Arrastre con el ratón (en pantallas táctiles la rueda se desliza de forma nativa)
  const drag = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  // La animación que invita a arrastrar se detiene en cuanto el estudiante usa la rueda.
  // Solo un desplazamiento suyo elige opción: el centrado inicial y los ajustes del snap no.
  const [hasInteracted, setHasInteracted] = useState(selectedIndex >= 0)
  const userMovedWheel = useRef(false)

  function markUserInteraction() {
    userMovedWheel.current = true
    setHasInteracted(true)
  }

  function handlePointerDown(event: PointerEvent<HTMLUListElement>) {
    markUserInteraction()
    const list = listRef.current
    if (event.pointerType !== 'mouse' || !list) return
    drag.current = { startY: event.clientY, startTop: list.scrollTop, moved: false }
    setIsDragging(true)
  }

  function handlePointerMove(event: PointerEvent<HTMLUListElement>) {
    const list = listRef.current
    if (!drag.current || !list) return
    const deltaY = event.clientY - drag.current.startY
    if (Math.abs(deltaY) > 3) drag.current.moved = true
    list.scrollTop = drag.current.startTop - deltaY
  }

  function endDrag() {
    if (!drag.current) return
    setIsDragging(false)
    // Al soltar vuelve el ajuste a la opción centrada, que queda elegida al terminar el desplazamiento
    window.setTimeout(() => {
      drag.current = null
    })
  }

  function select(index: number) {
    // Un arrastre no es un clic sobre la opción
    if (drag.current?.moved) return
    markUserInteraction()
    onChange(options[index])
    scrollToIndex(index, 'smooth')
  }

  function handleScroll() {
    window.clearTimeout(settleTimer.current)
    settleTimer.current = window.setTimeout(() => {
      const list = listRef.current
      // Al terminar un desplazamiento hecho por código, la respuesta ya está elegida
      if (isScrollingByCode.current || !list || !userMovedWheel.current) {
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
    markUserInteraction()
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
        onPointerDown={handlePointerDown}
        onWheel={markUserInteraction}
        onTouchStart={markUserInteraction}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        className={`h-[168px] select-none overflow-y-auto overscroll-contain rounded-2xl py-14 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-teal ${
          isDragging ? 'cursor-grabbing' : 'snap-y snap-mandatory cursor-grab'
        }`}
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
                  : 'border-transparent text-ocean/60 hover:text-ocean'
              }`}
            >
              {option}
            </li>
          )
        })}
      </ul>
      {/* Degradados suaves que dan sensación de rueda sin ocultar las opciones de los extremos */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-5 rounded-t-2xl bg-gradient-to-b from-white/80 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-5 rounded-b-2xl bg-gradient-to-t from-white/80 to-transparent" />
      {selectedIndex === -1 && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink/70">
          {/* Solo se mueve el icono: la rueda queda quieta hasta que el estudiante la usa */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={`h-5 w-5 text-ocean ${hasInteracted ? '' : 'motion-safe:animate-[drag-hint_1.4s_ease-in-out_infinite]'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 11V6a1.5 1.5 0 0 1 3 0v4m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 14a1.5 1.5 0 0 1 2.4-1.8L9 15" />
          </svg>
          Arrastra la rueda o toca una opción para elegirla
        </p>
      )}
    </div>
  )
}
