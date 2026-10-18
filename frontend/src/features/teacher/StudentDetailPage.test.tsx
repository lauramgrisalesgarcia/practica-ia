import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { StudentDetail } from '@/domain/student'
import { StudentDetailPage } from './StudentDetailPage'

const EMMA_NAME = 'Emma Schmidt'

const EMMA: StudentDetail = {
  id: '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83',
  name: EMMA_NAME,
  email: 'emma@correo.com',
  nativeLanguage: 'de',
  level: 'A2',
  lessonsCount: 12,
}

function setup(loadStudent: (id: string) => Promise<StudentDetail> = vi.fn().mockResolvedValue(EMMA)) {
  render(
    <MemoryRouter>
      <StudentDetailPage studentId={EMMA.id} loadStudent={loadStudent} />
    </MemoryRouter>,
  )
  return { loadStudent }
}

describe('StudentDetailPage', () => {
  it('carga el alumno indicado', async () => {
    const { loadStudent } = setup()

    await screen.findByRole('heading', { level: 1, name: EMMA_NAME })
    expect(loadStudent).toHaveBeenCalledWith(EMMA.id)
  })

  it('muestra los datos del alumno', async () => {
    setup()

    expect(await screen.findByRole('heading', { level: 1, name: EMMA_NAME })).toBeInTheDocument()
    expect(screen.getByText('emma@correo.com')).toBeInTheDocument()
    expect(screen.getByText('A2')).toBeInTheDocument()
    expect(screen.getByText('alemán')).toBeInTheDocument()
    // Las clases realizadas se muestran en el historial, con las horas: no se repiten aquí
    expect(screen.queryByText('Clases realizadas')).not.toBeInTheDocument()
  })

  it('muestra el avatar con las iniciales del alumno', async () => {
    setup()

    const header = (await screen.findByRole('heading', { level: 1, name: EMMA_NAME })).closest('header') as HTMLElement
    expect(within(header).getByText('ES')).toBeInTheDocument()
  })

  it('indica que está cargando mientras obtiene el alumno', async () => {
    setup(() => new Promise(() => {}))

    expect(screen.getByText(/cargando alumno/i)).toBeInTheDocument()
  })

  it('muestra un error si el alumno no existe o no está asignado', async () => {
    setup(vi.fn().mockRejectedValue(new Error('Estudiante no encontrado')))

    expect(await screen.findByRole('alert')).toHaveTextContent('Estudiante no encontrado')
  })

  it('permite volver a la lista de alumnos', async () => {
    setup()

    expect(await screen.findByRole('link', { name: /volver a mis alumnos/i })).toHaveAttribute('href', '/docente')
  })
})
