import { createHttpClient } from '../../http/httpClient'
import { NetworkError } from '../../http/errors'
import { describeAuthServiceContract, TEST_ACCOUNT, type TestAccount } from '../../test/contracts/authServiceContract'
import { createMemoryTokenStorage } from '../../test/fakes/memoryTokenStorage'
import { createHttpAuthService } from './httpAuthService'
import type { TokenStorage } from './tokenStorage'

const VALID_TOKEN = 'token-valido'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// Back falso que responde como /auth/login y /auth/me según docs/openapi.yaml
function createFakeBackend({ user, password }: TestAccount): typeof fetch {
  const [firstName, ...lastNames] = user.name.split(' ')
  const apiUser = {
    id: '8d3f6c2a-1b4e-4f7a-9c2d-5e6f7a8b9c01',
    first_name: firstName,
    last_name: lastNames.join(' '),
    email: user.email,
    role: user.role,
  }

  return async (input, init) => {
    const path = new URL(String(input)).pathname
    if (path === '/auth/login' && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { email: string; password: string }
      if (body.email.toLowerCase() !== user.email || body.password !== password) {
        return json(401, { detail: 'Credenciales incorrectas' })
      }
      return json(200, { access_token: VALID_TOKEN, token_type: 'bearer', expires_in: 3600, user: apiUser })
    }
    if (path === '/auth/me' && init?.method === 'GET') {
      const authorization = new Headers(init.headers).get('Authorization')
      if (authorization !== `Bearer ${VALID_TOKEN}`) return json(401, { detail: 'No autenticado' })
      return json(200, apiUser)
    }
    return json(404, { detail: 'Not Found' })
  }
}

function createService(fetchFn: typeof fetch, tokenStorage: TokenStorage = createMemoryTokenStorage()) {
  const http = createHttpClient({ baseUrl: 'http://api.test', getToken: tokenStorage.get, fetchFn })
  return createHttpAuthService({ http, tokenStorage })
}

describe('httpAuthService', () => {
  describeAuthServiceContract((account) => createService(createFakeBackend(account)))

  const { user, password } = TEST_ACCOUNT

  it('envía las credenciales a POST /auth/login', async () => {
    const fetchFn = vi.fn(createFakeBackend(TEST_ACCOUNT))

    await createService(fetchFn).login({ email: user.email, password })

    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe('http://api.test/auth/login')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ email: user.email, password })
  })

  it('guarda el token de acceso al iniciar sesión', async () => {
    const tokenStorage = createMemoryTokenStorage()

    await createService(createFakeBackend(TEST_ACCOUNT), tokenStorage).login({ email: user.email, password })

    expect(tokenStorage.get()).toBe(VALID_TOKEN)
  })

  it('recupera la sesión de un token ya guardado (p. ej. tras recargar la página)', async () => {
    const service = createService(createFakeBackend(TEST_ACCOUNT), createMemoryTokenStorage(VALID_TOKEN))

    await expect(service.getCurrentUser()).resolves.toEqual(user)
  })

  it('no llama a la API para el usuario actual si no hay token', async () => {
    const fetchFn = vi.fn(createFakeBackend(TEST_ACCOUNT))

    await createService(fetchFn).getCurrentUser()

    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('descarta un token caducado o inválido', async () => {
    const tokenStorage = createMemoryTokenStorage('token-caducado')

    await expect(createService(createFakeBackend(TEST_ACCOUNT), tokenStorage).getCurrentUser()).resolves.toBeNull()
    expect(tokenStorage.get()).toBeNull()
  })

  it('propaga un fallo de red al recuperar la sesión sin borrar el token', async () => {
    const tokenStorage = createMemoryTokenStorage(VALID_TOKEN)
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(createService(fetchFn, tokenStorage).getCurrentUser()).rejects.toBeInstanceOf(NetworkError)
    expect(tokenStorage.get()).toBe(VALID_TOKEN)
  })

  it('cerrar sesión borra el token', async () => {
    const tokenStorage = createMemoryTokenStorage(VALID_TOKEN)

    await createService(createFakeBackend(TEST_ACCOUNT), tokenStorage).logout()

    expect(tokenStorage.get()).toBeNull()
  })
})
