import { LoginForm } from './features/auth/LoginForm'

// Provisional hasta que exista el endpoint POST /auth/login
async function login(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 800))
  throw new Error('El servicio de autenticación aún no está disponible')
}

function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <section className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
        <LoginForm onSubmit={login} />
      </section>
    </main>
  )
}

export default App
