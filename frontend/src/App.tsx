import { LoginForm } from './features/auth/LoginForm'
import { useSession } from './features/session/sessionContext'
import { TeacherDashboard } from './features/teacher/TeacherDashboard'
import { useServices } from './services/servicesContext'

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

  if (session.status === 'anonymous') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <section className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
          <h1 className="mb-6 text-center text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
          <LoginForm onSubmit={session.login} />
        </section>
      </main>
    )
  }

  const { user } = session

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto mb-6 flex max-w-2xl justify-end">
        <button
          type="button"
          onClick={session.logout}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Cerrar sesión
        </button>
      </div>
      {user.role === 'docente' ? (
        <TeacherDashboard teacherName={user.name} loadStudents={() => teacherService.getAssignedStudents(user)} />
      ) : (
        <h1 className="mx-auto max-w-2xl text-2xl font-semibold text-gray-900">Hola, {user.name}</h1>
      )}
    </main>
  )
}

export default App
