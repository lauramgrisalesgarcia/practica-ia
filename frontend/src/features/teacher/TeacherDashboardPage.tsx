import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { TeacherInsights } from '@/domain/insights'
import type { Student } from '@/domain/student'
import { languageName } from '@/shared/i18n/languageName'
import { studentDetailPath } from '@/shared/routes/paths'
import { InsightsPanel } from './components/InsightsPanel'
import { countByLanguage, countByLevel, initials } from './components/studentStats'
import { errorMessage } from '@/shared/errors/errorMessage'

interface TeacherDashboardProps {
  teacherName: string
  // Debe ser una referencia estable: cada cambio vuelve a cargar los alumnos
  loadStudents: () => Promise<Student[]>
  loadInsights: () => Promise<TeacherInsights>
}

type StudentsState =
  | { status: 'loading' }
  | { status: 'loaded'; students: Student[] }
  | { status: 'error'; message: string }

export function TeacherDashboardPage({ teacherName, loadStudents, loadInsights }: TeacherDashboardProps) {
  const [state, setState] = useState<StudentsState>({ status: 'loading' })

  const load = useCallback(() => {
    let active = true
    loadStudents().then(
      (students) => active && setState({ status: 'loaded', students }),
      (error: unknown) =>
        active &&
        setState({ status: 'error', message: errorMessage(error, 'No se pudieron cargar los alumnos') }),
    )
    return () => {
      active = false
    }
  }, [loadStudents])

  useEffect(() => load(), [load])

  function retry() {
    setState({ status: 'loading' })
    load()
  }

  const students = state.status === 'loaded' ? state.students : []

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium uppercase tracking-wide text-ocean">Panel del docente</p>
        <h1 className="text-3xl font-semibold text-ink">Hola, {teacherName}</h1>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[20rem_1fr]">
        <aside aria-label="Mis alumnos" className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Mis alumnos</h2>
            {state.status === 'loaded' && (
              <span className="rounded-full bg-mist px-2.5 py-0.5 text-sm font-medium text-ocean">
                {students.length} {students.length === 1 ? 'alumno' : 'alumnos'}
              </span>
            )}
          </div>

          {state.status === 'loading' && <p className="text-sm text-ink/70">Cargando alumnos…</p>}

          {state.status === 'error' && (
            <div className="flex flex-col items-start gap-2">
              <p role="alert" className="text-sm text-red-700">
                {state.message}
              </p>
              <button
                type="button"
                onClick={retry}
                className="rounded-md bg-ocean px-3 py-1.5 text-sm font-medium text-white hover:bg-ink"
              >
                Reintentar
              </button>
            </div>
          )}

          {state.status === 'loaded' && students.length === 0 && (
            <p className="text-sm text-ink/70">No tienes alumnos asignados.</p>
          )}

          {students.length > 0 && (
            <>
              <ul aria-label="Alumnos asignados" className="-mx-2 flex flex-col">
                {students.map((student) => (
                  <li key={student.id}>
                    <Link
                      to={studentDetailPath(student.id)}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-mist focus-visible:outline-2 focus-visible:outline-ocean"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal text-sm font-semibold text-white"
                      >
                        {initials(student.name)}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold text-ink">{student.name}</span>
                        <span className="truncate text-xs text-ink/70">{student.email}</span>
                        <span className="text-xs text-ocean">
                          {student.level} · {languageName(student.nativeLanguage)}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <SidebarSection title="Alumnos por nivel">
                <ul className="flex flex-wrap gap-2">
                  {countByLevel(students).map(({ level, count }) => (
                    <li key={level} className="flex items-center gap-1 rounded-full bg-mist px-3 py-1 text-sm">
                      <span className="font-semibold text-ocean">{level}</span> <span className="text-ink">{count}</span>
                    </li>
                  ))}
                </ul>
              </SidebarSection>

              <SidebarSection title="Idiomas natales">
                <ul className="flex flex-col gap-1">
                  {countByLanguage(students).map(({ language, count }) => (
                    <li key={language} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-ink">{language}</span>{' '}
                      <span className="font-semibold text-ocean">{count}</span>
                    </li>
                  ))}
                </ul>
              </SidebarSection>
            </>
          )}
        </aside>

        <InsightsPanel loadInsights={loadInsights} />
      </div>
    </div>
  )
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2 border-t border-mist pt-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-ink/70">{title}</h3>
      {children}
    </section>
  )
}
