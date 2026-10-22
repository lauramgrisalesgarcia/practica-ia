import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { indexAtScroll, stepIndex } from './wheelIndex'

interface OptionWheelProps {
  options: string[]
  value: string | undefined
  onChange: (option: string) => void
}

const ITEM_HEIGHT = 56
// Tiempo sin desplazarse para dar por elegida la opción centrada
const SCROLL_SETTLE_MS = 120
// Margen para que termine un desplazamiento hecho por código (incluido el suave)
const CODE_SCROLL_MS = 600
// Movimiento mínimo del ratón para considerar que se arrastra y no que se hace clic
const DRAG_THRESHOLD_PX = 3

// Selector de rueda: se elige deslizando (la opción centrada), tocando una opción o con las flechas
export function OptionWheel({ options, value, onChange }: OptionWheelProps) {
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
    }, CODE_SCROLL_MS)
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
    if (Math.abs(deltaY) > DRAG_THRESHOLD_PX) drag.current.moved = true
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
      const index = indexAtScroll(list.scrollTop, ITEM_HEIGHT, options.length)
      if (options[index] !== value) onChange(options[index])
    }, SCROLL_SETTLE_MS)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    markUserInteraction()
    select(stepIndex(selectedIndex, step, options.length))
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
        className={`h-[168px] select-none overflow-y-auto overscroll-contain rounded-2xl py-14 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-rose ${
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
                  ? 'border-rose bg-cream font-semibold text-ocean'
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
