import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { StudentLessonSummary } from '@/domain/lesson'
import { COMPLETED_MATERIAL, MY_LESSONS, PENDING_MATERIAL } from '@/test/contracts/studentServiceContract'
import { StudentLessonPage } from './StudentLessonPage'

interface SetupOptions {
  lesson?: StudentLessonSummary
  loadLesson?: (lessonId: string) => Promise<StudentLessonSummary>
}

function setup({ lesson = MY_LESSONS[0], loadLesson = vi.fn().mockResolvedValue(lesson) }: SetupOptions = {}) {
  const loadMaterial = vi.fn().mockResolvedValue(lesson.id === MY_LESSONS[2].id ? COMPLETED_MATERIAL : PENDING_MATERIAL)
  const downloadPdf = vi.fn().mockResolvedValue({ blob: new Blob(['%PDF']), filename: lesson.pdfFilename })
  const openPdf = vi.fn()
  render(
    <MemoryRouter>
      <StudentLessonPage
        lessonId={lesson.id}
        loadLesson={loadLesson}
        downloadPdf={downloadPdf}
        openPdf={openPdf}
        loadMaterial={loadMaterial}
        submitMaterial={vi.fn()}
      />
    </MemoryRouter>,
  )
  return { loadLesson, loadMaterial, downloadPdf, openPdf, user: userEvent.setup() }
}

describe('StudentLessonPage', () => {
  it('muestra los datos de la clase: tema, fecha, contexto y palabras clave', async () => {
    const { loadLesson } = setup()

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedir en un restaurante' })).toBeInTheDocument()
    expect(loadLesson).toHaveBeenCalledWith(MY_LESSONS[0].id)
    expect(screen.getByText('8 de octubre de 2026 · 60 min')).toBeInTheDocument()
    expect(screen.getByText(MY_LESSONS[0].context)).toBeInTheDocument()
    const keywords = screen.getByRole('list', { name: 'Palabras clave' })
    expect(within(keywords).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['la carta', 'quisiera'])
  })

  it('permite volver al historial de clases', async () => {
    setup()

    expect(await screen.findByRole('link', { name: '← Volver a mis clases' })).toHaveAttribute('href', '/estudiante/clases')
  })

  it('descarga el PDF de la clase', async () => {
    const { user, downloadPdf, openPdf } = setup()

    await user.click(await screen.findByRole('button', { name: 'Descargar PDF (restaurante-a2.pdf)' }))

    expect(downloadPdf).toHaveBeenCalledWith(MY_LESSONS[0].id)
    expect(openPdf).toHaveBeenCalled()
  })

  it('muestra debajo el refuerzo para resolverlo', async () => {
    const { loadMaterial } = setup()

    expect(await screen.findByRole('heading', { level: 2, name: 'En el restaurante' })).toBeInTheDocument()
    expect(loadMaterial).toHaveBeenCalledWith(MY_LESSONS[0].id)
  })

  it('muestra la nota de una clase resuelta junto a sus datos', async () => {
    setup({ lesson: MY_LESSONS[2] })

    const card = await screen.findByRole('region', { name: 'Tu nota' })
    expect(card).toHaveTextContent('50 %')
    // La fecha llega con el refuerzo resuelto
    expect(await within(card).findByText('Resuelto el 25 de septiembre de 2026')).toBeInTheDocument()
  })

  it('avisa si la clase aún no tiene refuerzo, sin pedirlo', async () => {
    const { loadMaterial } = setup({ lesson: MY_LESSONS[1] })

    expect(await screen.findByText('Tu docente aún no ha preparado el refuerzo de esta clase.')).toBeInTheDocument()
    expect(loadMaterial).not.toHaveBeenCalled()
  })

  it('muestra un error si la clase no existe o es de otro estudiante', async () => {
    setup({ loadLesson: vi.fn().mockRejectedValue(new Error('Clase no encontrada')) })

    expect(await screen.findByRole('alert')).toHaveTextContent('Clase no encontrada')
  })
})
