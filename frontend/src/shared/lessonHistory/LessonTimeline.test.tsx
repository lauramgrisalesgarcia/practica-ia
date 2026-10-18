import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TeacherLessonSummary } from '@/domain/lesson'
import { EMMA_LESSONS } from '@/test/contracts/teacherLessonServiceContract'
import { LessonTimeline } from './LessonTimeline'

const TODAY = new Date('2026-10-15T12:00:00Z')

function setup(loadLessons: () => Promise<TeacherLessonSummary[]> = vi.fn().mockResolvedValue(EMMA_LESSONS)) {
  const renderActions = vi.fn((lesson: TeacherLessonSummary) => <button type="button">Ver {lesson.topic}</button>)
  render(
    <LessonTimeline
      loadLessons={loadLessons}
      renderActions={renderActions}
      emptyMessage="Aún no hay clases."
      today={TODAY}
      timeZone="UTC"
    />,
  )
  return { user: userEvent.setup(), renderActions }
}

function topics() {
  return within(screen.getByRole('region', { name: 'Historial de clases' }))
    .queryAllByRole('heading', { level: 4 })
    .map((heading) => heading.textContent)
}

describe('LessonTimeline', () => {
  it('indica que está cargando', () => {
    setup(vi.fn().mockReturnValue(new Promise(() => {})))

    expect(screen.getByText('Cargando clases…')).toBeInTheDocument()
  })

  it('muestra el error si no se puede cargar el historial', async () => {
    setup(vi.fn().mockRejectedValue(new Error('Sin conexión')))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión')
  })

  it('muestra el mensaje indicado si no hay clases', async () => {
    setup(vi.fn().mockResolvedValue([]))

    expect(await screen.findByText('Aún no hay clases.')).toBeInTheDocument()
  })

  it('resume el historial y lista las clases con sus acciones', async () => {
    const { renderActions } = setup()

    expect(await screen.findByRole('region', { name: 'Clases realizadas' })).toHaveTextContent('2')
    expect(screen.getByRole('region', { name: 'Nota media' })).toHaveTextContent('100')
    expect(topics()).toEqual(['Pedir en un restaurante', 'Presentarse'])
    expect(screen.getByRole('button', { name: 'Ver Presentarse' })).toBeInTheDocument()
    expect(renderActions).toHaveBeenCalledWith(EMMA_LESSONS[1])
  })

  it('filtra por estado del material y busca por tema', async () => {
    const { user } = setup()
    await screen.findByRole('group', { name: 'Filtrar por estado del material' })

    await user.click(screen.getByRole('button', { name: /^Sin material/ }))
    expect(topics()).toEqual(['Presentarse'])

    await user.click(screen.getByRole('button', { name: /^Todas/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Buscar por tema' }), 'zzz')
    expect(topics()).toEqual([])
    expect(screen.getByText('Ninguna clase coincide con los filtros.')).toBeInTheDocument()
  })
})
