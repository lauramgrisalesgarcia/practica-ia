import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { LessonSummary } from '../../../domain/lesson'
import { EMMA_ID, EMMA_LESSONS } from '../../../test/contracts/teacherLessonServiceContract'
import { StudentLessons } from './StudentLessons'

function setup(loadLessons: (studentId: string) => Promise<LessonSummary[]> = vi.fn().mockResolvedValue(EMMA_LESSONS)) {
  render(
    <MemoryRouter>
      <StudentLessons studentId={EMMA_ID} loadLessons={loadLessons} />
    </MemoryRouter>,
  )
  return { loadLessons }
}

describe('StudentLessons', () => {
  it('carga el historial del alumno indicado', async () => {
    const { loadLessons } = setup()

    await screen.findByRole('list', { name: /historial de clases/i })
    expect(loadLessons).toHaveBeenCalledWith(EMMA_ID)
  })

  it('muestra cada clase con su fecha, tema, duración y estado del material', async () => {
    setup()

    const [restaurante, presentarse] = within(await screen.findByRole('list', { name: /historial de clases/i })).getAllByRole(
      'listitem',
    )
    expect(restaurante).toHaveTextContent('Pedir en un restaurante')
    expect(restaurante).toHaveTextContent('8 de octubre de 2026')
    expect(restaurante).toHaveTextContent('60 min')
    expect(restaurante).toHaveTextContent('Material resuelto')
    expect(presentarse).toHaveTextContent('Presentarse')
    expect(presentarse).toHaveTextContent('Sin material')
  })

  it('enlaza cada clase con su detalle', async () => {
    setup()

    expect(await screen.findByRole('link', { name: 'Pedir en un restaurante' })).toHaveAttribute(
      'href',
      `/docente/clases/${EMMA_LESSONS[0].id}`,
    )
  })

  it('distingue el material pendiente de resolver', async () => {
    setup(vi.fn().mockResolvedValue([{ ...EMMA_LESSONS[0], materialStatus: 'pending' }]))

    expect(await screen.findByRole('listitem')).toHaveTextContent('Material pendiente')
  })

  it('indica que está cargando mientras obtiene el historial', () => {
    setup(() => new Promise(() => {}))

    expect(screen.getByText(/cargando clases/i)).toBeInTheDocument()
  })

  it('muestra un mensaje si el alumno aún no tiene clases', async () => {
    setup(vi.fn().mockResolvedValue([]))

    expect(await screen.findByText(/aún no tiene clases realizadas/i)).toBeInTheDocument()
  })

  it('muestra un error si no se puede cargar el historial', async () => {
    setup(vi.fn().mockRejectedValue(new Error('No se pudo conectar con el servidor')))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor')
  })
})
