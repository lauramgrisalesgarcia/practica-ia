import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Answer, StudentSubmission } from '@/domain/lesson'
import { COMPLETED_MATERIAL, PENDING_MATERIAL } from '@/test/contracts/studentServiceContract'
import { ExerciseStepper } from './ExerciseStepper'

const ARIA_SELECTED = 'aria-selected'
const SUBMIT_ANSWERS = 'Enviar respuestas'

const SUBMISSION = COMPLETED_MATERIAL.submission as StudentSubmission

function setup(
  submitMaterial: (lessonId: string, answers: Answer[]) => Promise<StudentSubmission> = vi.fn().mockResolvedValue(SUBMISSION),
) {
  const onSubmitted = vi.fn()
  render(
    <ExerciseStepper
      lessonId={PENDING_MATERIAL.lessonId}
      exercises={PENDING_MATERIAL.exercises}
      submitMaterial={submitMaterial}
      onSubmitted={onSubmitted}
    />,
  )
  return { submitMaterial, onSubmitted, user: userEvent.setup() }
}

function options() {
  return screen.getByRole('listbox', { name: 'Opciones' })
}

describe('ExerciseStepper', () => {
  it('muestra una pregunta cada vez con su progreso y sus opciones', () => {
    setup()

    expect(screen.getByText('Pregunta 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Progreso' })).toHaveAttribute('aria-valuenow', '1')
    const question = screen.getByRole('region', { name: 'Pregunta 1' })
    // El hueco se dibuja con una línea, sin «___» (quedarían dobles), y se anuncia a los lectores de pantalla
    expect(question).not.toHaveTextContent('___')
    expect(question).toHaveTextContent('Camarero, ¿nos trae espacio en blanco, por favor?')
    expect(within(options()).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'la carta',
      'la cuenta',
      'la mesa',
    ])
  })

  it('no deja avanzar hasta elegir una opción', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    expect(within(options()).getAllByRole('option').every((option) => option.getAttribute(ARIA_SELECTED) === 'false')).toBe(
      true,
    )
  })

  it('al elegir una opción la marca y la muestra en el hueco de la frase', async () => {
    const { user } = setup()

    await user.click(within(options()).getByRole('option', { name: 'la carta' }))

    expect(within(options()).getByRole('option', { name: 'la carta' })).toHaveAttribute(ARIA_SELECTED, 'true')
    expect(screen.getByRole('region', { name: 'Pregunta 1' })).toHaveTextContent('Camarero, ¿nos trae la carta, por favor?')
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  describe('rueda de opciones', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('un desplazamiento que no hace el estudiante (centrado inicial o ajuste) no elige opción', () => {
      setup()
      act(() => vi.advanceTimersByTime(1000))

      fireEvent.scroll(options())
      act(() => vi.advanceTimersByTime(500))

      expect(within(options()).queryByRole('option', { selected: true })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    })

    it('al deslizar la rueda elige la opción que queda centrada', () => {
      setup()
      act(() => vi.advanceTimersByTime(1000))

      fireEvent.wheel(options())
      fireEvent.scroll(options())
      act(() => vi.advanceTimersByTime(500))

      expect(within(options()).getByRole('option', { selected: true })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
    })
  })

  it('permite elegir con las flechas del teclado', async () => {
    const { user } = setup()

    options().focus()
    await user.keyboard('{ArrowDown}{ArrowDown}')

    expect(within(options()).getByRole('option', { name: 'la cuenta' })).toHaveAttribute(ARIA_SELECTED, 'true')
    await user.keyboard('{ArrowUp}')
    expect(within(options()).getByRole('option', { name: 'la carta' })).toHaveAttribute(ARIA_SELECTED, 'true')
  })

  it('pasa a la siguiente pregunta y permite volver sin perder la respuesta', async () => {
    const { user } = setup()
    await user.click(within(options()).getByRole('option', { name: 'la carta' }))

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(screen.getByText('Pregunta 2 de 2')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pregunta 2' })).toHaveTextContent('Buenas noches. espacio en blanco una mesa')
    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(within(options()).getByRole('option', { name: 'la carta' })).toHaveAttribute(ARIA_SELECTED, 'true')
  })

  it('en la última pregunta envía todas las respuestas y entrega el resultado', async () => {
    const { user, submitMaterial, onSubmitted } = setup()
    await user.click(within(options()).getByRole('option', { name: 'la carta' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(within(options()).getByRole('option', { name: 'Quiero que' }))

    await user.click(screen.getByRole('button', { name: SUBMIT_ANSWERS }))

    expect(submitMaterial).toHaveBeenCalledWith(PENDING_MATERIAL.lessonId, [
      { exerciseId: 1, selectedOption: 'la carta' },
      { exerciseId: 2, selectedOption: 'Quiero que' },
    ])
    expect(onSubmitted).toHaveBeenCalledWith(SUBMISSION)
  })

  it('indica que está enviando y desactiva el botón', async () => {
    const { user } = setup(() => new Promise(() => {}))
    await user.click(within(options()).getByRole('option', { name: 'la carta' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(within(options()).getByRole('option', { name: 'Quisiera' }))

    await user.click(screen.getByRole('button', { name: SUBMIT_ANSWERS }))

    expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
  })

  it('muestra un error si no se pueden enviar las respuestas', async () => {
    const { user, onSubmitted } = setup(vi.fn().mockRejectedValue(new Error('El material ya fue resuelto')))
    await user.click(within(options()).getByRole('option', { name: 'la carta' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(within(options()).getByRole('option', { name: 'Quisiera' }))

    await user.click(screen.getByRole('button', { name: SUBMIT_ANSWERS }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El material ya fue resuelto')
    expect(onSubmitted).not.toHaveBeenCalled()
  })
})
