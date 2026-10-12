import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeacherDashboard, type Student } from './TeacherDashboard'

const STUDENTS: Student[] = [
  { id: 1, name: 'Ana Gómez', email: 'ana@colegio.edu' },
  { id: 2, name: 'Luis Pérez', email: 'luis@colegio.edu' },
]

function setup(loadStudents = vi.fn().mockResolvedValue(STUDENTS)) {
  const user = userEvent.setup()
  render(<TeacherDashboard teacherName="María López" loadStudents={loadStudents} />)
  return {
    user,
    loadStudents,
    viewStudentsButton: screen.getByRole('button', { name: /ver alumnos asignados/i }),
  }
}

describe('TeacherDashboard', () => {
  it('saluda al docente por su nombre', () => {
    setup()

    expect(screen.getByRole('heading', { level: 1, name: /maría lópez/i })).toBeInTheDocument()
  })

  it('no carga los alumnos hasta que el docente lo solicita', () => {
    const { loadStudents } = setup()

    expect(loadStudents).not.toHaveBeenCalled()
    expect(screen.queryByRole('list', { name: /alumnos asignados/i })).not.toBeInTheDocument()
  })

  it('muestra los alumnos asignados al pulsar el botón', async () => {
    const { user, loadStudents, viewStudentsButton } = setup()

    await user.click(viewStudentsButton)

    const list = await screen.findByRole('list', { name: /alumnos asignados/i })
    expect(loadStudents).toHaveBeenCalledOnce()
    expect(list).toHaveTextContent('Ana Gómez')
    expect(list).toHaveTextContent('ana@colegio.edu')
    expect(list).toHaveTextContent('Luis Pérez')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('indica que está cargando mientras obtiene los alumnos', async () => {
    let resolve!: (students: Student[]) => void
    const loadStudents = vi.fn(() => new Promise<Student[]>((r) => (resolve = r)))
    const { user, viewStudentsButton } = setup(loadStudents)

    await user.click(viewStudentsButton)

    expect(screen.getByText(/cargando alumnos/i)).toBeInTheDocument()
    expect(viewStudentsButton).toBeDisabled()
    resolve(STUDENTS)
    expect(await screen.findByRole('list', { name: /alumnos asignados/i })).toBeInTheDocument()
    expect(screen.queryByText(/cargando alumnos/i)).not.toBeInTheDocument()
  })

  it('muestra un mensaje cuando no tiene alumnos asignados', async () => {
    const { user, viewStudentsButton } = setup(vi.fn().mockResolvedValue([]))

    await user.click(viewStudentsButton)

    expect(await screen.findByText(/no tienes alumnos asignados/i)).toBeInTheDocument()
  })

  it('muestra un error si no se pueden cargar los alumnos', async () => {
    const { user, viewStudentsButton } = setup(
      vi.fn().mockRejectedValue(new Error('No se pudieron cargar los alumnos')),
    )

    await user.click(viewStudentsButton)

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los alumnos')
    expect(viewStudentsButton).toBeEnabled()
  })
})
