import { createContext, useContext } from 'react'
import type { LoginCredentials } from '@/domain/auth'
import type { User } from '@/domain/user'

export type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: User }

export type Session = SessionState & {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
}

export const SessionContext = createContext<Session | null>(null)

export function useSession(): Session {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession debe usarse dentro de SessionProvider')
  return session
}
