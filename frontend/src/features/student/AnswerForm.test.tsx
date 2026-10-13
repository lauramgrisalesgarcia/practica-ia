import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Answer, StudentSubmission } from '../../domain/lesson'
import { COMPLETED_MATERIAL, PENDING_MATERIAL } from '../../test/contracts/studentServiceContract'
import { AnswerForm } from './AnswerForm'

const SUBMISSION = COMPLETED_MATERIAL.submission as StudentSubmission

function setup(submitMaterial: (lessonId: string, answers: Answer[]) => Promise<StudentSubmission> = vi.fn().mockResolvedValue(SUBMISSION)) {
  const onSubmitted = vi.fn()
  render(
    <AnswerForm
      lessonId={PENDING_MATERIAL.lessonId}
      exercises={PENDING_MATERIAL.exercises}
      submitMaterial={submitMaterial}
      onSubmitted={onSubmitted}
    />,
  )
  return { user: userEvent.setup(), submitMaterial, onSubmitted }
}

function exercise(index: number) {
  return screen.getAllByRole('radiogroup')[index]
}

async function answerAll(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(exercise(0)).getByRole('radio', { name: 'la carta' }))
  await user.click(within(exercise(1)).getByRole('radio', { name: 'Quiero que' }))
}

describe('AnswerForm', () => {
  it('muestra cada ejercicio con sus opciones para elegir una', () => {
    setup()

    const groups = screen.getAllByRole('radiogroup')
    expect(groups).toHaveLength(2)
    expect(groups[0]).toHaveAccessibleName(/camarero, ¿nos trae ___, por favor\?/i)
    expect(within(groups[0]).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual([
      'la carta',
      'la cuenta',
      'la mesa',
    ])
  })

  it('envía una respuesta por ejercicio y entrega el resultado', async () => {
    const { user, submitMaterial, onSubmitted } = setup()

    await answerAll(user)
    await user.click(screen.getByRole('button', { name: 'Enviar respuestas' }))

    expect(submitMaterial).toHaveBeenCalledWith(PENDING_MATERIAL.lessonId, [
      { exerciseId: 1, selectedOption: 'la carta' },
      { exerciseId: 2, selectedOption: 'Quiero que' },
    ])
    expect(onSubmitted).toHaveBeenCalledWith(SUBMISSION)
  })

  it('no envía nada si falta algún ejercicio por responder', async () => {
    const { user, submitMaterial } = setup()

    await user.click(within(exercise(0)).getByRole('radio', { name: 'la carta' }))
    await user.click(screen.getByRole('button', { name: 'Enviar respuestas' }))

    expect(screen.getByText('Responde todos los ejercicios antes de enviar')).toBeInTheDocument()
    expect(exercise(0)).not.toHaveAttribute('aria-invalid')
    expect(exercise(1)).toHaveAttribute('aria-invalid', 'true')
    expect(submitMaterial).not.toHaveBeenCalled()
  })

  it('quita el aviso de un ejercicio al responderlo', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Enviar respuestas' }))

    await user.click(within(exercise(1)).getByRole('radio', { name: 'Quisiera' }))

    expect(exercise(1)).not.toHaveAttribute('aria-invalid')
  })

  it('indica que está enviando y desactiva el botón', async () => {
    let resolve!: (submission: StudentSubmission) => void
    const { user } = setup(() => new Promise((r) => (resolve = r)))
    await answerAll(user)
    const button = screen.getByRole('button', { name: 'Enviar respuestas' })

    await user.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(/enviando/i)
    resolve(SUBMISSION)
    expect(await screen.findByRole('button', { name: 'Enviar respuestas' })).toBeEnabled()
  })

  it.each([
    ['ya lo resolvió (409)', 'El material ya fue resuelto'],
    ['las respuestas no son válidas (422)', 'Debes responder todos los ejercicios con una opción válida'],
    ['fallan las recomendaciones del LLM (502)', 'No se pudieron generar las recomendaciones'],
  ])('muestra el error si %s y conserva las respuestas', async (_, message) => {
    const { user, onSubmitted } = setup(vi.fn().mockRejectedValue(new Error(message)))
    await answerAll(user)

    await user.click(screen.getByRole('button', { name: 'Enviar respuestas' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(within(exercise(0)).getByRole('radio', { name: 'la carta' })).toBeChecked()
    expect(onSubmitted).not.toHaveBeenCalled()
  })
})
