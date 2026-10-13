import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router'
import { LoginForm } from './features/auth/LoginForm'
import { useSession } from './features/session/sessionContext'
import { StudentDetailPage } from './features/teacher/StudentDetailPage'
import { TeacherDashboard } from './features/teacher/TeacherDashboard'
import { homePathFor, LOGIN_PATH, STUDENT_DETAIL_ROUTE } from './routes/paths'
import { RequireRole } from './routes/RequireRole'
import { useServices } from './services/servicesContext'

function HomeRedirect() {
  const session = useSession()
  if (session.status !== 'authenticated') return <Navigate to={LOGIN_PATH} replace />
  return <Navigate to={homePathFor(session.user.role)} replace />
}

function LoginPage() {
  const session = useSession()
  if (session.status === 'authenticated') return <Navigate to={homePathFor(session.user.role)} replace />

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
        <LoginForm onSubmit={session.login} />
      </section>
    </main>
  )
}

function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { logout } = useSession()

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto mb-6 flex max-w-2xl justify-end">
        <button type="button" onClick={logout} className="text-sm font-medium text-gray-600 hover:text-gray-900">
          Cerrar sesión
        </button>
      </div>
      {children}
    </main>
  )
}

function StudentDetailRoute() {
  const { teacherService } = useServices()
  const { studentId = '' } = useParams()
  return <StudentDetailPage key={studentId} studentId={studentId} loadStudent={teacherService.getStudent} />
}

function App() {
  const { teacherService } = useServices()
  const session = useSession()

  if (session.status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <p className="text-gray-500">Cargando…</p>
      </main>
    )
  }

  return (
    <Routes>
      <Route path={LOGIN_PATH} element={<LoginPage />} />
      <Route
        path={homePathFor('docente')}
        element={
          <RequireRole role="docente">
            {(user) => (
              <AuthenticatedLayout>
                <TeacherDashboard teacherName={user.name} loadStudents={teacherService.getAssignedStudents} />
              </AuthenticatedLayout>
            )}
          </RequireRole>
        }
      />
      <Route
        path={STUDENT_DETAIL_ROUTE}
        element={
          <RequireRole role="docente">
            {() => (
              <AuthenticatedLayout>
                <StudentDetailRoute />
              </AuthenticatedLayout>
            )}
          </RequireRole>
        }
      />
      <Route
        path={homePathFor('estudiante')}
        element={
          <RequireRole role="estudiante">
            {(user) => (
              <AuthenticatedLayout>
                <h1 className="mx-auto max-w-2xl text-2xl font-semibold text-gray-900">Hola, {user.name}</h1>
              </AuthenticatedLayout>
            )}
          </RequireRole>
        }
      />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

export default App
