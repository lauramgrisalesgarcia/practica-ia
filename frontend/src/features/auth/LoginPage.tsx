import { Navigate } from 'react-router'
import { homePathFor } from '@/shared/routes/paths'
import { LoginForm } from './components/LoginForm'
import { useSession } from './session/sessionContext'

export function LoginPage() {
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
