import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { languageName } from '../../shared/i18n/languageName'
import type { StudentDetail } from '../../domain/student'
import { homePathFor } from '../../shared/routes/paths'

interface StudentDetailPageProps {
  studentId: string
  // Debe ser una referencia estable: cada cambio vuelve a cargar el alumno.
  // Para cambiar de alumno, móntalo con key={studentId} y empieza de nuevo en «cargando».
  loadStudent: (studentId: string) => Promise<StudentDetail>
}

type StudentState =
  | { status: 'loading' }
  | { status: 'loaded'; student: StudentDetail }
  | { status: 'error'; message: string }

export function StudentDetailPage({ studentId, loadStudent }: StudentDetailPageProps) {
  const [state, setState] = useState<StudentState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    loadStudent(studentId).then(
      (student) => active && setState({ status: 'loaded', student }),
      (error: unknown) =>
        active &&
        setState({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar el alumno' }),
    )
    return () => {
      active = false
    }
  }, [studentId, loadStudent])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link to={homePathFor('docente')} className="self-start text-sm font-medium text-blue-600 hover:text-blue-800">
        ← Volver a mis alumnos
      </Link>

      {state.status === 'loading' && <p className="text-sm text-gray-500">Cargando alumno…</p>}

      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && (
        <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
          <header className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-gray-900">{state.student.name}</h1>
            <p className="text-sm text-gray-500">{state.student.email}</p>
          </header>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Nivel</dt>
              <dd className="text-lg font-medium text-gray-900">{state.student.level}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Idioma natal</dt>
              <dd className="text-lg font-medium text-gray-900">{languageName(state.student.nativeLanguage)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Clases realizadas</dt>
              <dd className="text-lg font-medium text-gray-900">{state.student.lessonsCount}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  )
}
