import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { Answer, StudentMaterial, StudentSubmission } from '@/domain/lesson'
import { COMPLETED_MATERIAL, PENDING_MATERIAL } from '@/test/contracts/studentServiceContract'
import { StudentMaterialPanel } from './StudentMaterialPanel'

const MATERIAL_TITLE = 'En el restaurante'
const SOLVE_MATERIAL = 'Resolver refuerzo'
const RESULT_SUMMARY = 'Resumen del resultado'

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

// Tarjetas de las preguntas corregidas (sin las opciones, que también son elementos de lista)
function questionItems() {
  return within(screen.getByRole('list', { name: 'Ejercicios' }))
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.closest('li') as HTMLElement)
}

describe('StudentMaterialPanel', () => {
  it('carga el material de la clase indicada', async () => {
    const { loadMaterial } = setup()

    await screen.findByRole('heading', { level: 2, name: MATERIAL_TITLE })
    expect(loadMaterial).toHaveBeenCalledWith(PENDING_MATERIAL.lessonId)
  })

  it('presenta la actividad pendiente y la muestra solo al pulsar «Resolver refuerzo»', async () => {
    const { user } = setup()

    await screen.findByRole('heading', { level: 2, name: MATERIAL_TITLE })
    expect(screen.getByText('Completa cada frase con la opción correcta.')).toBeInTheDocument()
    expect(screen.getByText('2 preguntas')).toBeInTheDocument()
    const start = screen.getByRole('button', { name: SOLVE_MATERIAL })
    expect(start).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.click(start)

    expect(screen.getByText('Pregunta 1 de 2')).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Opciones' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: SOLVE_MATERIAL })).not.toBeInTheDocument()
  })

  it('muestra el resultado al enviar las respuestas, sin recargar', async () => {
    const { user, submitMaterial, loadMaterial } = setup()
    await screen.findByRole('heading', { level: 2, name: MATERIAL_TITLE })

    await user.click(screen.getByRole('button', { name: SOLVE_MATERIAL }))
    await user.click(screen.getByRole('option', { name: 'la carta' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    await user.click(screen.getByRole('option', { name: 'Quiero que' }))
    await user.click(screen.getByRole('button', { name: 'Enviar respuestas' }))

    const summary = await screen.findByRole('region', { name: RESULT_SUMMARY })
    expect(summary).toHaveTextContent('1 correctas · 1 incorrectas')
    expect(within(summary).getByRole('list', { name: 'Recomendaciones' })).toHaveTextContent('Usa «quisiera»')
    const [, second] = questionItems()
    expect(second).toHaveTextContent('Incorrecta')
    expect(screen.queryByRole('button', { name: 'Enviar respuestas' })).not.toBeInTheDocument()
    expect(submitMaterial).toHaveBeenCalledOnce()
    expect(loadMaterial).toHaveBeenCalledOnce()
  })

  it('avisa del resultado al cargar un material ya resuelto', async () => {
    const onResult = vi.fn()
    render(
      <MemoryRouter>
        <StudentMaterialPanel
          lessonId={COMPLETED_MATERIAL.lessonId}
          loadMaterial={vi.fn().mockResolvedValue(COMPLETED_MATERIAL)}
          submitMaterial={vi.fn()}
          onResult={onResult}
        />
      </MemoryRouter>,
    )

    await screen.findByRole('region', { name: RESULT_SUMMARY })
    expect(onResult).toHaveBeenCalledWith(COMPLETED_MATERIAL.submission)
  })

  it('no permite volver a resolver un material ya resuelto', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    await screen.findByRole('region', { name: RESULT_SUMMARY })
    expect(screen.queryByRole('button', { name: SOLVE_MATERIAL })).not.toBeInTheDocument()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('no muestra resultado mientras el material está pendiente', async () => {
    setup()

    await screen.findByRole('heading', { level: 2, name: MATERIAL_TITLE })
    expect(screen.queryByRole('region', { name: RESULT_SUMMARY })).not.toBeInTheDocument()
    expect(screen.queryByText(/incorrecta/i)).not.toBeInTheDocument()
  })

  it('muestra el resumen del resultado antes de las preguntas, sin una sección «Tu resultado» aparte', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    const summary = await screen.findByRole('region', { name: RESULT_SUMMARY })
    expect(summary).toHaveTextContent('1 correctas · 1 incorrectas')
    expect(summary).toHaveTextContent('Bien con «hace calor». Repasa el verbo llover.')
    expect(within(summary).getByRole('list', { name: 'Recomendaciones' })).toHaveTextContent(
      'Después de «va a» va un verbo en infinitivo: «va a llover».',
    )
    const questions = screen.getByRole('list', { name: 'Ejercicios' })
    expect(summary.compareDocumentPosition(questions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Tu resultado' })).not.toBeInTheDocument()
  })

  it('presenta cada pregunta en su tarjeta numerada como la ve el docente', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    const questions = await screen.findByRole('list', { name: 'Ejercicios' })
    expect(within(questions).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Pregunta 1',
      'Pregunta 2',
    ])
  })

  it('indica qué preguntas acertó y en las incorrectas su respuesta y la correcta', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    await screen.findByRole('list', { name: 'Ejercicios' })
    const [first, second] = questionItems()
    expect(first).toHaveTextContent('Correcta')
    expect(first).not.toHaveTextContent('Incorrecta')
    expect(within(first).getByText('hace')).toHaveAccessibleDescription('Tu respuesta, correcta')
    expect(second).toHaveTextContent('Incorrecta')
    expect(within(second).getByText('lluvia')).toHaveAccessibleDescription('Tu respuesta, incorrecta')
    expect(within(second).getByText('llover')).toHaveAccessibleDescription('Respuesta correcta')
    expect(within(second).getByText('lloviendo')).not.toHaveAccessibleDescription()
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
