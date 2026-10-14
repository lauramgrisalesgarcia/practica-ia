import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { LessonPdf, LessonSummary } from '@/domain/lesson'
import { StudentLessons } from './StudentLessons'

const STUDENT_ID = '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83'
const PDF: LessonPdf = { blob: new Blob(['%PDF']), filename: 'restaurante-a2.pdf' }

const LESSONS: LessonSummary[] = [
  {
    id: 'l1',
    date: '2026-10-08T16:00:00Z',
    durationMinutes: 60,
    topic: 'Pedir en un restaurante',
    context: 'Pedir comida y bebida y pedir la cuenta',
    materialStatus: 'completed',
  },
  {
    id: 'l2',
    date: '2026-10-06T15:00:00Z',
    durationMinutes: 45,
    topic: 'Hablar del fin de semana',
    context: 'Contar lo que hiciste a un compañero',
    materialStatus: 'pending',
  },
  {
    id: 'l3',
    date: '2026-09-17T16:00:00Z',
    durationMinutes: 90,
    topic: 'Presentarse',
    context: 'Presentarse y hablar de la familia',
    materialStatus: 'none',
  },
]

interface SetupOptions {
  loadLessons?: (studentId: string) => Promise<LessonSummary[]>
  downloadPdf?: (lessonId: string) => Promise<LessonPdf>
}

function setup({
  loadLessons = vi.fn().mockResolvedValue(LESSONS),
  downloadPdf = vi.fn().mockResolvedValue(PDF),
}: SetupOptions = {}) {
  const openPdf = vi.fn()
  render(
    <MemoryRouter>
      <StudentLessons
        studentId={STUDENT_ID}
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

// Espera a que el historial esté cargado (los filtros solo aparecen entonces)
async function findHistory() {
  await screen.findByRole('group', { name: 'Filtrar por estado del material' })
  return screen.getByRole('region', { name: 'Historial de clases' })
}

function lessonItem(topic: string) {
  return screen.getByRole('heading', { name: topic }).closest('li') as HTMLElement
}

function visibleTopics() {
  return screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent)
}

describe('StudentLessons', () => {
  it('carga el historial del alumno indicado', async () => {
    const { loadLessons } = setup()

    await findHistory()
    expect(loadLessons).toHaveBeenCalledWith(STUDENT_ID)
  })

  describe('indicadores', () => {
    it('muestra las clases realizadas y el tiempo total', async () => {
      setup()

      const card = await screen.findByRole('region', { name: 'Clases realizadas' })
      expect(card).toHaveTextContent('3')
      expect(card).toHaveTextContent('3 h 15 min en total')
    })

    it('muestra cuándo fue la última clase', async () => {
      setup()

      const card = await screen.findByRole('region', { name: 'Última clase' })
      expect(card).toHaveTextContent('8 de octubre de 2026')
      expect(card).toHaveTextContent('hace 5 días')
    })

    it('muestra el progreso del material', async () => {
      setup()

      const card = await screen.findByRole('region', { name: 'Material resuelto' })
      expect(card).toHaveTextContent('1 de 2')
      const progress = within(card).getByRole('progressbar')
      expect(progress).toHaveAttribute('aria-valuenow', '1')
      expect(progress).toHaveAttribute('aria-valuemax', '2')
    })
  })

  describe('filtros', () => {
    it('ofrece un filtro por estado con el número de clases de cada uno', async () => {
      setup()

      await findHistory()
      const group = screen.getByRole('group', { name: 'Filtrar por estado del material' })
      const filters = within(group).getAllByRole('button')
      expect(filters.map((filter) => filter.textContent)).toEqual(['Todas3', 'Sin material1', 'Pendiente1', 'Resuelto1'])
      expect(filters[0]).toHaveAttribute('aria-pressed', 'true')
    })

    it('muestra solo las clases del estado elegido', async () => {
      const { user } = setup()
      await findHistory()

      await user.click(screen.getByRole('button', { name: /^pendiente/i }))

      expect(screen.getByRole('button', { name: /^pendiente/i })).toHaveAttribute('aria-pressed', 'true')
      expect(visibleTopics()).toEqual(['Hablar del fin de semana'])
    })

    it('busca por tema', async () => {
      const { user } = setup()
      await findHistory()

      await user.type(screen.getByRole('searchbox', { name: 'Buscar por tema' }), 'presentar')

      expect(visibleTopics()).toEqual(['Presentarse'])
    })

    it('avisa cuando ninguna clase coincide', async () => {
      const { user } = setup()
      await findHistory()

      await user.type(screen.getByRole('searchbox', { name: 'Buscar por tema' }), 'astronomía')

      expect(screen.getByText('Ninguna clase coincide con los filtros.')).toBeInTheDocument()
    })
  })

  it('agrupa las clases por mes', async () => {
    setup()

    const history = await findHistory()
    expect(within(history).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'Octubre de 2026',
      'Septiembre de 2026',
    ])
  })

  it('muestra de cada clase su fecha, duración, contexto y estado', async () => {
    setup()
    await findHistory()

    const restaurante = lessonItem('Pedir en un restaurante')
    expect(restaurante).toHaveTextContent('8 de octubre de 2026 · 60 min')
    expect(restaurante).toHaveTextContent('Pedir comida y bebida y pedir la cuenta')
    expect(restaurante).toHaveTextContent('Material resuelto')
    expect(lessonItem('Hablar del fin de semana')).toHaveTextContent('Material pendiente')
    expect(lessonItem('Presentarse')).toHaveTextContent('Sin material')
  })

  describe('acciones', () => {
    it('enlaza cada clase con su detalle', async () => {
      setup()
      await findHistory()

      const link = within(lessonItem('Pedir en un restaurante')).getByRole('link', { name: 'Ver clase' })
      expect(link).toHaveAttribute('href', '/docente/clases/l1')
    })

    it('ofrece generar material si la clase no tiene y regenerarlo si está pendiente', async () => {
      setup()
      await findHistory()

      const generate = within(lessonItem('Presentarse')).getByRole('link', { name: 'Generar material' })
      expect(generate).toHaveAttribute('href', '/docente/clases/l3#generar-material')
      const regenerate = within(lessonItem('Hablar del fin de semana')).getByRole('link', { name: 'Regenerar material' })
      expect(regenerate).toHaveAttribute('href', '/docente/clases/l2#generar-material')
      const completed = lessonItem('Pedir en un restaurante')
      expect(within(completed).queryByRole('link', { name: /generar material/i })).not.toBeInTheDocument()
    })

    it('descarga el PDF de la clase', async () => {
      const { user, downloadPdf, openPdf } = setup()
      await findHistory()

      await user.click(within(lessonItem('Pedir en un restaurante')).getByRole('button', { name: /pdf/i }))

      expect(downloadPdf).toHaveBeenCalledWith('l1')
      expect(openPdf).toHaveBeenCalledWith(PDF)
    })
  })

  it('indica que está cargando mientras obtiene el historial', () => {
    setup({ loadLessons: () => new Promise(() => {}) })

    expect(screen.getByText(/cargando clases/i)).toBeInTheDocument()
  })

  it('muestra un mensaje si el alumno aún no tiene clases', async () => {
    setup({ loadLessons: vi.fn().mockResolvedValue([]) })

    expect(await screen.findByText(/aún no tiene clases realizadas/i)).toBeInTheDocument()
  })

  it('muestra un error si no se puede cargar el historial', async () => {
    setup({ loadLessons: vi.fn().mockRejectedValue(new Error('No se pudo conectar con el servidor')) })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor')
  })
})
