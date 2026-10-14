import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import type { TeacherInsights } from '@/domain/insights'
import type { Student } from '@/domain/student'
import { createSampleTeacherInsightsService } from './services/sampleTeacherInsightsService'
import { TeacherDashboardPage } from './TeacherDashboardPage'

const STUDENTS: Student[] = [
  { id: 'b71e4a90-2c5d-4f3e-8a1b-6d7c8e9f0a12', name: 'Ana Gómez', email: 'ana@colegio.edu', nativeLanguage: 'en', level: 'B1' },
  { id: '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83', name: 'Luis Pérez', email: 'luis@colegio.edu', nativeLanguage: 'de', level: 'A2' },
  { id: '5c8d2e7f-1a3b-4c9d-8e6f-2b4a7c9d1e3f', name: 'Sofía Ramírez', email: 'sofia@colegio.edu', nativeLanguage: 'en', level: 'B1' },
]

const loadSampleInsights: () => Promise<TeacherInsights> = createSampleTeacherInsightsService({ delayMs: 0 }).getInsights

function setup(loadStudents: () => Promise<Student[]> = vi.fn().mockResolvedValue(STUDENTS)) {
  render(
    <MemoryRouter>
      <TeacherDashboardPage teacherName="María López" loadStudents={loadStudents} loadInsights={loadSampleInsights} />
    </MemoryRouter>,
  )
  return { loadStudents, user: userEvent.setup() }
}

async function findSidebar() {
  return screen.findByRole('complementary', { name: 'Mis alumnos' })
}

async function findStudentCards() {
  return within(await findSidebar()).findAllByRole('link').then((links) => links.map((link) => link.closest('li') as HTMLElement))
}

describe('TeacherDashboardPage', () => {
  it('saluda al docente por su nombre', () => {
    setup()

    expect(screen.getByRole('heading', { level: 1, name: /maría lópez/i })).toBeInTheDocument()
  })

  it('carga los alumnos al entrar, sin que el docente tenga que pedirlo', async () => {
    const { loadStudents } = setup()

    expect(await findStudentCards()).toHaveLength(3)
    expect(loadStudents).toHaveBeenCalledOnce()
  })

  it('muestra sus alumnos en una columna lateral con el total', async () => {
    setup()

    const sidebar = await findSidebar()
    expect(await within(sidebar).findByRole('list', { name: 'Alumnos asignados' })).toBeInTheDocument()
    expect(within(sidebar).getByText('3 alumnos')).toBeInTheDocument()
  })

  it('resume cuántos alumnos hay de cada nivel', async () => {
    setup()

    const sidebar = await findSidebar()
    const levels = within(await within(sidebar).findByRole('region', { name: 'Alumnos por nivel' })).getAllByRole('listitem')
    expect(levels.map((level) => level.textContent)).toEqual(['A2 1', 'B1 2'])
  })

  it('resume los idiomas natales de sus alumnos', async () => {
    setup()

    const sidebar = await findSidebar()
    const languages = within(await within(sidebar).findByRole('region', { name: 'Idiomas natales' })).getAllByRole('listitem')
    expect(languages.map((language) => language.textContent)).toEqual(['inglés 2', 'alemán 1'])
  })

  it('muestra cada alumno con sus iniciales, nivel e idioma, enlazado a su detalle', async () => {
    setup()

    const [ana] = await findStudentCards()
    expect(ana).toHaveTextContent('AG')
    expect(ana).toHaveTextContent('Ana Gómez')
    expect(ana).toHaveTextContent('ana@colegio.edu')
    expect(ana).toHaveTextContent('B1 · inglés')
    expect(within(ana).getByRole('link')).toHaveAttribute('href', `/docente/alumnos/${STUDENTS[0].id}`)
  })

  it('muestra el resumen de actividad', async () => {
    setup()

    expect(await screen.findByRole('heading', { name: 'Resumen de actividad' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Clases por semana' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Calendario de clases' })).toBeInTheDocument()
  })

  it('indica que está cargando mientras obtiene los alumnos', () => {
    setup(() => new Promise(() => {}))

    expect(screen.getByText(/cargando alumnos/i)).toBeInTheDocument()
  })

  it('muestra un mensaje cuando no tiene alumnos asignados', async () => {
    setup(vi.fn().mockResolvedValue([]))

    expect(await screen.findByText(/no tienes alumnos asignados/i)).toBeInTheDocument()
    expect(within(await findSidebar()).getByText('0 alumnos')).toBeInTheDocument()
  })

  it('muestra un error y permite reintentar la carga', async () => {
    const loadStudents = vi
      .fn()
      .mockRejectedValueOnce(new Error('No se pudo conectar con el servidor'))
      .mockResolvedValueOnce(STUDENTS)
    const { user } = setup(loadStudents)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor')
    await user.click(screen.getByRole('button', { name: /reintentar/i }))

    expect(await findStudentCards()).toHaveLength(3)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
