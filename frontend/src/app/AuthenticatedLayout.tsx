import type { ReactNode } from 'react'
import type { Role } from '@/domain/user'
import { useSession } from '@/features/auth/session/sessionContext'
import { Brand } from '@/shared/components/Brand'

const ROLE_LABELS: Record<Role, string> = {
  docente: 'Docente',
  estudiante: 'Estudiante',
}

// Marco común de las páginas con sesión iniciada
export function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = useSession()

  return (
    <div className="min-h-screen">
      <header className="bg-ocean text-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Brand tone="light" className="text-2xl text-white" />
          <div className="flex items-center gap-4">
            {session.status === 'authenticated' && (
              <span className="hidden flex-col items-end leading-tight sm:flex">
                <span className="text-sm font-medium">{session.user.name}</span>
                <span className="text-xs text-cream">{ROLE_LABELS[session.user.role]}</span>
              </span>
            )}
            <button
              type="button"
              onClick={session.logout}
              className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="px-4 py-8">{children}</main>
    </div>
  )
}
