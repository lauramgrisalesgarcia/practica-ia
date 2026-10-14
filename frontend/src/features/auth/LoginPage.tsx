import { Navigate } from 'react-router'
import { Brand } from '@/shared/components/Brand'
import { homePathFor } from '@/shared/routes/paths'
import { LoginForm } from './components/LoginForm'
import { useSession } from './session/sessionContext'

export function LoginPage() {
  const session = useSession()
  if (session.status === 'authenticated') return <Navigate to={homePathFor(session.user.role)} replace />

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Brand className="text-5xl text-ink" />
        <p className="text-sm text-ink/70">Material de refuerzo personalizado para cada clase</p>
      </div>
      <section className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-ink">Iniciar sesión</h1>
        {session.status === 'anonymous' && session.expired && (
          <p role="status" className="mb-4 rounded-md bg-mist px-3 py-2 text-sm text-ocean">
            Tu sesión ha caducado. Vuelve a iniciar sesión.
          </p>
        )}
        <LoginForm onSubmit={session.login} />
      </section>
    </main>
  )
}
