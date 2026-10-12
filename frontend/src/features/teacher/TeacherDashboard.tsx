import { useState } from 'react'
import type { Student } from '../../domain/student'

interface TeacherDashboardProps {
  teacherName: string
  loadStudents: () => Promise<Student[]>
}

type StudentsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; students: Student[] }
  | { status: 'error'; message: string }

export function TeacherDashboard({ teacherName, loadStudents }: TeacherDashboardProps) {
  const [state, setState] = useState<StudentsState>({ status: 'idle' })

  async function handleViewStudents() {
    setState({ status: 'loading' })
    try {
      const students = await loadStudents()
      setState({ status: 'loaded', students })
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'No se pudieron cargar los alumnos',
      })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-gray-500">Panel del docente</p>
        <h1 className="text-2xl font-semibold text-gray-900">Hola, {teacherName}</h1>
      </header>

      <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
        <button
          type="button"
          onClick={handleViewStudents}
          disabled={state.status === 'loading'}
          className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Ver alumnos asignados
        </button>

        {state.status === 'loading' && <p className="text-sm text-gray-500">Cargando alumnos…</p>}

        {state.status === 'error' && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message}
          </p>
        )}

        {state.status === 'loaded' && state.students.length === 0 && (
          <p className="text-sm text-gray-500">No tienes alumnos asignados.</p>
        )}

        {state.status === 'loaded' && state.students.length > 0 && (
          <ul aria-label="Alumnos asignados" className="divide-y divide-gray-200">
            {state.students.map((student) => (
              <li key={student.id} className="flex flex-col py-3">
                <span className="font-medium text-gray-900">{student.name}</span>
                <span className="text-sm text-gray-500">{student.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
