import type { TokenStorage } from '../../features/auth/tokenStorage'

export function createMemoryTokenStorage(initialToken: string | null = null): TokenStorage {
  let token = initialToken
  return {
    get: () => token,
    set: (value) => {
      token = value
    },
    clear: () => {
      token = null
    },
  }
}
