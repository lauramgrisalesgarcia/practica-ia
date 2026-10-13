import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { LessonDetail, LessonPdf, MaterialRequest, TeacherMaterial } from '../../domain/lesson'
import { INTRODUCTIONS_LESSON, RESTAURANT_LESSON } from '../../test/contracts/teacherLessonServiceContract'
import { LessonDetailPage } from './LessonDetailPage'

const PDF: LessonPdf = { blob: new Blob(['%PDF']), filename: 'restaurante-a2.pdf' }

interface SetupOptions {
  lesson?: LessonDetail
  loadLesson?: (lessonId: string) => Promise<LessonDetail>
  downloadPdf?: (lessonId: string) => Promise<LessonPdf>
  generateMaterial?: (lessonId: string, request: MaterialRequest) => Promise<TeacherMaterial>
}

const NEW_MATERIAL: TeacherMaterial = {
  generatedAt: '2026-10-13T09:00:00Z',
  activityType: 'complete_sentence',
  title: 'Presentaciones',
  instructions: 'Completa cada frase con la opción correcta.',
  exercises: [{ id: 1, sentence: 'Hola, ___ Emma.', options: ['me llamo', 'llamo', 'se llama'], correctOption: 'me llamo' }],
}

function setup({
  lesson = RESTAURANT_LESSON,
  loadLesson = vi.fn().mockResolvedValue(lesson),
  downloadPdf = vi.fn().mockResolvedValue(PDF),
  generateMaterial = vi.fn().mockResolvedValue(NEW_MATERIAL),
}: SetupOptions = {}) {
  const openPdf = vi.fn()
  render(
    <MemoryRouter>
      <LessonDetailPage
        lessonId={lesson.id}
        loadLesson={loadLesson}
        downloadPdf={downloadPdf}
        openPdf={openPdf}
        generateMaterial={generateMaterial}
      />
    </MemoryRouter>,
  )
  return { loadLesson, downloadPdf, openPdf, generateMaterial, user: userEvent.setup() }
}

async function findHeading() {
  return screen.findByRole('heading', { level: 1, name: 'Pedir en un restaurante' })
}

describe('LessonDetailPage', () => {
  it('carga la clase indicada', async () => {
    const { loadLesson } = setup()

    await findHeading()
    expect(loadLesson).toHaveBeenCalledWith(RESTAURANT_LESSON.id)
  })

  it('muestra los datos de la clase', async () => {
    setup()

    await findHeading()
    expect(screen.getByText('8 de octubre de 2026 · 60 min')).toBeInTheDocument()
    expect(screen.getByText(RESTAURANT_LESSON.context)).toBeInTheDocument()
    expect(screen.getByText("Confunde 'quiero' y 'quisiera'.")).toBeInTheDocument()
    const keywords = screen.getByRole('list', { name: /palabras clave/i })
    expect(within(keywords).getAllByRole('listitem').map((item) => item.textContent)).toEqual(RESTAURANT_LESSON.keywords)
  })

  it('enlaza con el alumno de la clase', async () => {
    setup()

    expect(await screen.findByRole('link', { name: /emma schmidt/i })).toHaveAttribute(
      'href',
      `/docente/alumnos/${RESTAURANT_LESSON.student.id}`,
    )
  })

  it('indica cuando la clase no tiene notas', async () => {
    setup({ lesson: INTRODUCTIONS_LESSON })

    expect(await screen.findByText(/sin notas/i)).toBeInTheDocument()
  })

  it('muestra el material con la respuesta correcta de cada ejercicio', async () => {
    setup()

    const material = await screen.findByRole('region', { name: 'Material de refuerzo' })
    expect(within(material).getByRole('heading', { name: 'En el restaurante' })).toBeInTheDocument()
    expect(material).toHaveTextContent('Completa cada frase con la opción correcta.')
    const [exercise] = within(material).getAllByRole('listitem')
    expect(exercise).toHaveTextContent('Camarero, ¿nos trae ___, por favor?')
    expect(exercise).toHaveTextContent('la carta')
    expect(exercise).toHaveTextContent('la cuenta')
    expect(within(exercise).getByText('la carta')).toHaveAccessibleDescription('Respuesta correcta')
  })

  it('muestra el resultado del alumno si ya resolvió el material', async () => {
    setup()

    const result = await screen.findByRole('region', { name: 'Resultado del alumno' })
    expect(result).toHaveTextContent('100 %')
    expect(result).toHaveTextContent('1 correctas')
    expect(result).toHaveTextContent('0 incorrectas')
  })

  it('indica que el alumno aún no ha resuelto el material', async () => {
    setup({ lesson: { ...RESTAURANT_LESSON, materialStatus: 'pending', submission: null } })

    expect(await screen.findByText(/aún no ha resuelto el material/i)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Resultado del alumno' })).not.toBeInTheDocument()
  })

  it('indica que aún no hay material de refuerzo', async () => {
    setup({ lesson: INTRODUCTIONS_LESSON })

    expect(await screen.findByText(/aún no se ha generado material de refuerzo/i)).toBeInTheDocument()
  })

  it('descarga y abre el PDF de la clase', async () => {
    const { user, downloadPdf, openPdf } = setup()

    await user.click(await screen.findByRole('button', { name: /descargar pdf/i }))

    expect(downloadPdf).toHaveBeenCalledWith(RESTAURANT_LESSON.id)
    expect(openPdf).toHaveBeenCalledWith(PDF)
  })

  it('desactiva el botón mientras descarga el PDF', async () => {
    let resolve!: (pdf: LessonPdf) => void
    const { user } = setup({ downloadPdf: () => new Promise((r) => (resolve = r)) })
    const button = await screen.findByRole('button', { name: /descargar pdf/i })

    await user.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(/descargando/i)
    resolve(PDF)
    expect(await screen.findByRole('button', { name: /descargar pdf/i })).toBeEnabled()
  })

  it('muestra un error si no se puede descargar el PDF', async () => {
    const { user, openPdf } = setup({
      downloadPdf: vi.fn().mockRejectedValue(new Error('El PDF de la clase no está disponible')),
    })

    await user.click(await screen.findByRole('button', { name: /descargar pdf/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El PDF de la clase no está disponible')
    expect(openPdf).not.toHaveBeenCalled()
  })

  describe('generar material', () => {
    it('ofrece generar material si la clase aún no lo tiene', async () => {
      setup({ lesson: INTRODUCTIONS_LESSON })

      expect(await screen.findByRole('button', { name: 'Generar material' })).toBeInTheDocument()
    })

    it('ofrece regenerar el material que el alumno aún no ha resuelto', async () => {
      setup({ lesson: { ...RESTAURANT_LESSON, materialStatus: 'pending', submission: null } })

      expect(await screen.findByRole('button', { name: 'Regenerar material' })).toBeInTheDocument()
    })

    it('no permite regenerar el material que el alumno ya resolvió', async () => {
      setup()

      await findHeading()
      expect(screen.queryByRole('form', { name: /generar material/i })).not.toBeInTheDocument()
    })

    it('muestra el material recién generado pendiente de resolver', async () => {
      const { user, generateMaterial } = setup({ lesson: INTRODUCTIONS_LESSON })

      await user.click(await screen.findByRole('button', { name: 'Generar material' }))

      const material = await screen.findByRole('region', { name: 'Material de refuerzo' })
      expect(within(material).getByRole('heading', { name: 'Presentaciones' })).toBeInTheDocument()
      expect(screen.getByText(/aún no ha resuelto el material/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Regenerar material' })).toBeInTheDocument()
      expect(generateMaterial).toHaveBeenCalledWith(INTRODUCTIONS_LESSON.id, expect.objectContaining({ exerciseCount: 5 }))
    })
  })

  it('indica que está cargando mientras obtiene la clase', () => {
    setup({ loadLesson: () => new Promise(() => {}) })

    expect(screen.getByText(/cargando clase/i)).toBeInTheDocument()
  })

  it('muestra un error si la clase no existe o es de otro docente', async () => {
    setup({ loadLesson: vi.fn().mockRejectedValue(new Error('Clase no encontrada')) })

    expect(await screen.findByRole('alert')).toHaveTextContent('Clase no encontrada')
  })
})
