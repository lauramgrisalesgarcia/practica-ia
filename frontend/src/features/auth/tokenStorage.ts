export interface TokenStorage {
  get: () => string | null
  set: (token: string) => void
  clear: () => void
}

const TOKEN_KEY = 'practica-ia.access-token'

export function createBrowserTokenStorage(storage: Storage = sessionStorage): TokenStorage {
  return {
    get: () => storage.getItem(TOKEN_KEY),
    set: (token) => storage.setItem(TOKEN_KEY, token),
    clear: () => storage.removeItem(TOKEN_KEY),
  }
}
