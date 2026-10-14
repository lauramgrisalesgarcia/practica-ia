import { useEffect, useState, type ReactNode } from 'react'
import type { LoginCredentials } from '@/domain/auth'
import type { AuthService } from '@/features/auth/services/authService'
import { SessionContext, type SessionState } from './sessionContext'

interface SessionProviderProps {
  authService: AuthService
  children: ReactNode
}

export function SessionProvider({ authService, children }: SessionProviderProps) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    authService
      .getCurrentUser()
      .catch(() => null)
      .then((user) => {
        if (active) setState(user ? { status: 'authenticated', user } : { status: 'anonymous' })
      })
    return () => {
      active = false
    }
  }, [authService])

  useEffect(
    () => authService.onSessionExpired(() => setState({ status: 'anonymous', expired: true })),
    [authService],
  )

  async function login(credentials: LoginCredentials) {
    const user = await authService.login(credentials)
    setState({ status: 'authenticated', user })
  }

  async function logout() {
    await authService.logout()
    setState({ status: 'anonymous' })
  }

  return <SessionContext.Provider value={{ ...state, login, logout }}>{children}</SessionContext.Provider>
}
