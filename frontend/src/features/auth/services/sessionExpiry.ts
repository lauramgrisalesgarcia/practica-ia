// Aviso de sesión caducada: el cliente HTTP lo dispara y el servicio de autenticación lo escucha
export interface SessionExpiry {
  notify: () => void
  // Devuelve la función para darse de baja
  subscribe: (listener: () => void) => () => void
}

export function createSessionExpiry(): SessionExpiry {
  const listeners = new Set<() => void>()
  return {
    notify: () => listeners.forEach((listener) => listener()),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
