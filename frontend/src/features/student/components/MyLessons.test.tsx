import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import userEvent from '@testing-library/user-event'
import type { LessonPdf, StudentLessonSummary } from '../../../domain/lesson'
import { MY_LESSONS } from '../../../test/contracts/studentServiceContract'
import { MyLessons } from './MyLessons'

const PDF: LessonPdf = { blob: new Blob(['%PDF']), filename: 'restaurante-a2.pdf' }

interface SetupOptions {
  loadLessons?: () => Promise<StudentLessonSummary[]>
  downloadPdf?: (lessonId: string) => Promise<LessonPdf>
}

function setup({
  loadLessons = vi.fn().mockResolvedValue(MY_LESSONS),
  downloadPdf = vi.fn().mockResolvedValue(PDF),
}: SetupOptions = {}) {
  const openPdf = vi.fn()
  render(
    <MemoryRouter>
      <MyLessons loadLessons={loadLessons} downloadPdf={downloadPdf} openPdf={openPdf} />
    </MemoryRouter>,
  )
  return { loadLessons, downloadPdf, openPdf, user: userEvent.setup() }
}

async function findLessons() {
  return within(await screen.findByRole('list', { name: /mis clases/i })).getAllByRole('listitem')
}

describe('MyLessons', () => {
  it('muestra cada clase con su fecha, tema, duración y estado del material', async () => {
    setup()

    const [restaurante, presentarse] = await findLessons()
    expect(restaurante).toHaveTextContent('Pedir en un restaurante')
    expect(restaurante).toHaveTextContent('8 de octubre de 2026 · 60 min')
    expect(restaurante).toHaveTextContent('Material por resolver')
    expect(presentarse).toHaveTextContent('Presentarse')
    expect(presentarse).toHaveTextContent('Sin material')
  })

  it('enlaza con su material las clases que lo tienen', async () => {
    setup()

    const [restaurante, presentarse, tiempo] = await findLessons()
    expect(within(restaurante).getByRole('link', { name: 'Pedir en un restaurante' })).toHaveAttribute(
      'href',
      `/estudiante/clases/${MY_LESSONS[0].id}`,
    )
    expect(within(tiempo).getByRole('link', { name: 'Hablar del tiempo' })).toBeInTheDocument()
    expect(within(presentarse).queryByRole('link')).not.toBeInTheDocument()
  })

  it('indica las clases cuyo material ya resolvió', async () => {
    setup({ loadLessons: vi.fn().mockResolvedValue([{ ...MY_LESSONS[0], materialStatus: 'completed' }]) })

    const [lesson] = await findLessons()
    expect(lesson).toHaveTextContent('Material resuelto')
  })

  it('descarga y abre el PDF de la clase elegida', async () => {
    const { user, downloadPdf, openPdf } = setup()

    const [restaurante] = await findLessons()
    await user.click(within(restaurante).getByRole('button', { name: /descargar pdf/i }))

    expect(downloadPdf).toHaveBeenCalledWith(MY_LESSONS[0].id)
    expect(openPdf).toHaveBeenCalledWith(PDF)
  })

  it('muestra el error de descarga solo en la clase afectada', async () => {
    const { user } = setup({ downloadPdf: vi.fn().mockRejectedValue(new Error('El PDF de la clase no está disponible')) })

    const [restaurante, presentarse] = await findLessons()
    await user.click(within(restaurante).getByRole('button', { name: /descargar pdf/i }))

    expect(await within(restaurante).findByRole('alert')).toHaveTextContent('El PDF de la clase no está disponible')
    expect(within(presentarse).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('indica que está cargando mientras obtiene las clases', () => {
    setup({ loadLessons: () => new Promise(() => {}) })

    expect(screen.getByText(/cargando clases/i)).toBeInTheDocument()
  })

  it('muestra un mensaje si aún no tiene clases', async () => {
    setup({ loadLessons: vi.fn().mockResolvedValue([]) })

    expect(await screen.findByText(/aún no tienes clases realizadas/i)).toBeInTheDocument()
  })

  it('muestra un error si no se pueden cargar las clases', async () => {
    setup({ loadLessons: vi.fn().mockRejectedValue(new Error('No se pudo conectar con el servidor')) })

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor')
  })
})
