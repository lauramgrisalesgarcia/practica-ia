import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import type { Role, User } from '../domain/user'
import { useSession } from '../features/session/sessionContext'
import { homePathFor, LOGIN_PATH } from './paths'

interface RequireRoleProps {
  role: Role
  children: (user: User) => ReactNode
}

// Solo muestra la página a usuarios con sesión y el rol indicado
export function RequireRole({ role, children }: RequireRoleProps) {
  const session = useSession()

  if (session.status !== 'authenticated') return <Navigate to={LOGIN_PATH} replace />
  if (session.user.role !== role) return <Navigate to={homePathFor(session.user.role)} replace />
  return children(session.user)
}
