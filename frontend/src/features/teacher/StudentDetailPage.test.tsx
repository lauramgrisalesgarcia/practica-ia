import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { StudentDetail } from '../../domain/student'
import { StudentDetailPage } from './StudentDetailPage'

const EMMA: StudentDetail = {
  id: '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83',
  name: 'Emma Schmidt',
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

    await screen.findByRole('heading', { level: 1, name: 'Emma Schmidt' })
    expect(loadStudent).toHaveBeenCalledWith(EMMA.id)
  })

  it('muestra los datos del alumno', async () => {
    setup()

    expect(await screen.findByRole('heading', { level: 1, name: 'Emma Schmidt' })).toBeInTheDocument()
    expect(screen.getByText('emma@correo.com')).toBeInTheDocument()
    expect(screen.getByText('A2')).toBeInTheDocument()
    expect(screen.getByText('alemán')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
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
