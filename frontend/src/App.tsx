import { useState } from 'react'
import type { LoginCredentials } from './domain/auth'
import type { User } from './domain/user'
import { LoginForm } from './features/auth/LoginForm'
import { TeacherDashboard } from './features/teacher/TeacherDashboard'
import { useServices } from './services/servicesContext'

function App() {
  const { authService, teacherService } = useServices()
  const [user, setUser] = useState<User | null>(null)

  async function handleLogin(credentials: LoginCredentials) {
    setUser(await authService.login(credentials))
  }

  if (user?.role === 'docente') {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <TeacherDashboard
          teacherName={user.name}
          loadStudents={() => teacherService.getAssignedStudents(user)}
        />
      </main>
    )
  }

  if (user?.role === 'estudiante') {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <h1 className="mx-auto max-w-2xl text-2xl font-semibold text-gray-900">Hola, {user.name}</h1>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
        <LoginForm onSubmit={handleLogin} />
      </section>
    </main>
  )
}

export default App
