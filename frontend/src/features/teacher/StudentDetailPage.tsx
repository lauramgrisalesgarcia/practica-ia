import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { languageName } from '@/shared/i18n/languageName'
import type { StudentDetail } from '@/domain/student'
import { homePathFor } from '@/shared/routes/paths'
import { initials } from './components/studentStats'
import { errorMessage } from '@/shared/errors/errorMessage'

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
        setState({ status: 'error', message: errorMessage(error, 'No se pudo cargar el alumno') }),
    )
    return () => {
      active = false
    }
  }, [studentId, loadStudent])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Link to={homePathFor('docente')} className="self-start text-sm font-medium text-ocean hover:text-ink">
        ← Volver a mis alumnos
      </Link>

      {state.status === 'loading' && <p className="text-sm text-ink/70">Cargando alumno…</p>}

      {state.status === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {state.status === 'loaded' && (
        <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md">
          <header className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose text-lg font-semibold text-white"
            >
              {initials(state.student.name)}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h1 className="text-2xl font-semibold text-ink">{state.student.name}</h1>
              <p className="truncate text-sm text-ink/70">{state.student.email}</p>
            </div>
          </header>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink/70">Nivel</dt>
              <dd className="text-lg font-medium text-ink">{state.student.level}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink/70">Idioma natal</dt>
              <dd className="text-lg font-medium text-ink">{languageName(state.student.nativeLanguage)}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  )
}
