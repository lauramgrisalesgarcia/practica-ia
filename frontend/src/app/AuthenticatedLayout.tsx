import type { ReactNode } from 'react'
import { useSession } from '@/features/auth/session/sessionContext'

// Marco común de las páginas con sesión iniciada
export function AuthenticatedLayout({ children }: { children: ReactNode }) {
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
