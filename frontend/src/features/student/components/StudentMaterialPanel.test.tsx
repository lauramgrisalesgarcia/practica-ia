import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { Answer, StudentMaterial, StudentSubmission } from '@/domain/lesson'
import { COMPLETED_MATERIAL, PENDING_MATERIAL } from '@/test/contracts/studentServiceContract'
import { StudentMaterialPanel } from './StudentMaterialPanel'

const SUBMISSION: StudentSubmission = {
  submittedAt: '2026-10-13T10:00:00Z',
  correctCount: 1,
  incorrectCount: 1,
  score: 50,
  results: [
    { exerciseId: 1, selectedOption: 'la carta', correctOption: 'la carta', isCorrect: true },
    { exerciseId: 2, selectedOption: 'Quiero que', correctOption: 'Quisiera', isCorrect: false },
  ],
  feedback: 'Muy bien con «la carta».',
  recommendations: ['Usa «quisiera» para pedir algo de forma cortés.'],
}

function setup(
  loadMaterial: (lessonId: string) => Promise<StudentMaterial> = vi.fn().mockResolvedValue(PENDING_MATERIAL),
  submitMaterial: (lessonId: string, answers: Answer[]) => Promise<StudentSubmission> = vi.fn().mockResolvedValue(SUBMISSION),
) {
  render(
    <MemoryRouter>
      <StudentMaterialPanel lessonId={PENDING_MATERIAL.lessonId} loadMaterial={loadMaterial} submitMaterial={submitMaterial} />
    </MemoryRouter>,
  )
  return { loadMaterial, submitMaterial, user: userEvent.setup() }
}

describe('StudentMaterialPanel', () => {
  it('carga el material de la clase indicada', async () => {
    const { loadMaterial } = setup()

    await screen.findByRole('heading', { level: 2, name: 'En el restaurante' })
    expect(loadMaterial).toHaveBeenCalledWith(PENDING_MATERIAL.lessonId)
  })

  it('presenta la actividad pendiente y la muestra solo al pulsar «Resolver refuerzo»', async () => {
    const { user } = setup()

    await screen.findByRole('heading', { level: 2, name: 'En el restaurante' })
    expect(screen.getByText('Completa cada frase con la opción correcta.')).toBeInTheDocument()
    expect(screen.getByText('2 preguntas')).toBeInTheDocument()
    const start = screen.getByRole('button', { name: 'Resolver refuerzo' })
    expect(start).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.click(start)

    expect(screen.getByText('Pregunta 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Opciones' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Resolver refuerzo' })).not.toBeInTheDocument()
  })

  it('muestra el resultado al enviar las respuestas, sin recargar', async () => {
    const { user, submitMaterial, loadMaterial } = setup()
    await screen.findByRole('heading', { level: 2, name: 'En el restaurante' })

    await user.click(screen.getByRole('button', { name: 'Resolver refuerzo' }))
    await user.click(screen.getByRole('option', { name: 'la carta' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(screen.getByRole('option', { name: 'Quiero que' }))
    await user.click(screen.getByRole('button', { name: 'Enviar respuestas' }))

    const result = await screen.findByRole('region', { name: 'Tu resultado' })
    expect(result).toHaveTextContent('50 %')
    expect(within(result).getByRole('list', { name: 'Recomendaciones' })).toHaveTextContent('Usa «quisiera»')
    const [secondResult] = within(screen.getByRole('list', { name: 'Ejercicios' })).getAllByRole('listitem').slice(1)
    expect(secondResult).toHaveTextContent('Respuesta correcta: Quisiera')
    expect(screen.queryByRole('button', { name: 'Enviar respuestas' })).not.toBeInTheDocument()
    expect(submitMaterial).toHaveBeenCalledOnce()
    expect(loadMaterial).toHaveBeenCalledOnce()
  })

  it('no permite volver a resolver un material ya resuelto', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    await screen.findByRole('region', { name: 'Tu resultado' })
    expect(screen.queryByRole('button', { name: 'Resolver refuerzo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('no muestra resultado mientras el material está pendiente', async () => {
    setup()

    await screen.findByRole('heading', { level: 2, name: 'En el restaurante' })
    expect(screen.queryByRole('region', { name: 'Tu resultado' })).not.toBeInTheDocument()
    expect(screen.queryByText(/correcto|incorrecto/i)).not.toBeInTheDocument()
  })

  it('muestra el resultado si ya resolvió el material', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    const result = await screen.findByRole('region', { name: 'Tu resultado' })
    expect(result).toHaveTextContent('50 %')
    expect(result).toHaveTextContent('1 correctas · 1 incorrectas')
  })

  it('marca cada ejercicio resuelto como correcto o incorrecto con la respuesta correcta', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    const [first, second] = within(await screen.findByRole('list', { name: 'Ejercicios' })).getAllByRole('listitem')
    expect(first).toHaveTextContent('Correcto')
    expect(first).toHaveTextContent('Tu respuesta: hace')
    expect(second).toHaveTextContent('Incorrecto')
    expect(second).toHaveTextContent('Tu respuesta: lluvia')
    expect(second).toHaveTextContent('Respuesta correcta: llover')
  })

  it('muestra el comentario y las recomendaciones', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    const result = await screen.findByRole('region', { name: 'Tu resultado' })
    expect(result).toHaveTextContent('Bien con «hace calor». Repasa el verbo llover.')
    expect(within(result).getByRole('list', { name: 'Recomendaciones' })).toHaveTextContent(
      'Después de «va a» va un verbo en infinitivo: «va a llover».',
    )
  })

  it('indica que está cargando mientras obtiene el material', () => {
    setup(() => new Promise(() => {}))

    expect(screen.getByText(/cargando material/i)).toBeInTheDocument()
  })

  it('muestra un error si la clase no tiene material', async () => {
    setup(vi.fn().mockRejectedValue(new Error('La clase no tiene material de refuerzo')))

    expect(await screen.findByRole('alert')).toHaveTextContent('La clase no tiene material de refuerzo')
  })
})
