import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { LessonPdf } from '@/domain/lesson'
import { MY_LESSONS } from '@/test/contracts/studentServiceContract'
import { StudentLessonsPage } from './StudentLessonsPage'

const PDF: LessonPdf = { blob: new Blob(['%PDF']), filename: 'tiempo-a2.pdf' }

function setup() {
  const loadLessons = vi.fn().mockResolvedValue(MY_LESSONS)
  const downloadPdf = vi.fn().mockResolvedValue(PDF)
  const openPdf = vi.fn()
  render(
    <MemoryRouter>
      <StudentLessonsPage
        loadLessons={loadLessons}
        downloadPdf={downloadPdf}
        openPdf={openPdf}
        today={new Date('2026-10-13T09:00:00Z')}
        timeZone="UTC"
      />
    </MemoryRouter>,
  )
  return { loadLessons, downloadPdf, openPdf, user: userEvent.setup() }
}

function lessonItem(topic: string) {
  return screen.getByRole('heading', { name: topic }).closest('li') as HTMLElement
}

async function findHistory() {
  await screen.findByRole('group', { name: 'Filtrar por estado del material' })
  return screen.getByRole('region', { name: 'Historial de clases' })
}

describe('StudentLessonsPage', () => {
  it('muestra el historial con un enlace de vuelta al panel', async () => {
    const { loadLessons } = setup()

    expect(screen.getByRole('heading', { level: 1, name: 'Mis clases' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Volver a mi panel' })).toHaveAttribute('href', '/estudiante')
    await findHistory()
    expect(loadLessons).toHaveBeenCalled()
  })

  it('muestra el resumen, los filtros y la búsqueda como el historial del docente', async () => {
    setup()
    await findHistory()

    expect(screen.getByRole('region', { name: 'Clases realizadas' })).toHaveTextContent('3')
    expect(screen.getByRole('region', { name: 'Nota media' })).toHaveTextContent('50 %')
    expect(screen.getByRole('searchbox', { name: 'Buscar por tema' })).toBeInTheDocument()
  })

  it('muestra de cada clase sus palabras clave y la nota en su etiqueta', async () => {
    setup()
    await findHistory()

    const weather = lessonItem('Hablar del tiempo')
    expect(weather).toHaveTextContent('Resuelto · 50 %')
    const keywords = within(weather).getByRole('list', { name: 'Palabras clave' })
    expect(within(keywords).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['hace calor', 'llover'])
  })

  it('enlaza cada clase con su detalle', async () => {
    setup()
    await findHistory()

    expect(within(lessonItem('Presentarse')).getByRole('link', { name: 'Ver clase' })).toHaveAttribute(
      'href',
      `/estudiante/clases/${MY_LESSONS[1].id}`,
    )
  })

  it('descarga el PDF de una clase', async () => {
    const { user, downloadPdf, openPdf } = setup()
    await findHistory()

    await user.click(within(lessonItem('Hablar del tiempo')).getByRole('button', { name: 'PDF' }))

    expect(downloadPdf).toHaveBeenCalledWith(MY_LESSONS[2].id)
    expect(openPdf).toHaveBeenCalledWith(PDF)
  })
})
