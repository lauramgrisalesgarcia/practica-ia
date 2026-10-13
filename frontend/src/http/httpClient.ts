import { ApiError, NetworkError } from './errors'

export interface HttpClient {
  get: <T>(path: string) => Promise<T>
  post: <T>(path: string, body: unknown) => Promise<T>
}

interface HttpClientOptions {
  baseUrl: string
  getToken: () => string | null
  fetchFn?: typeof fetch
}

const VALIDATION_MESSAGE = 'Los datos enviados no son válidos'
const UNEXPECTED_MESSAGE = 'Error inesperado del servidor'

async function errorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'detail' in body && typeof body.detail === 'string') {
      return body.detail
    }
  } catch {
    return UNEXPECTED_MESSAGE
  }
  return response.status === 422 ? VALIDATION_MESSAGE : UNEXPECTED_MESSAGE
}

export function createHttpClient({ baseUrl, getToken, fetchFn = fetch }: HttpClientOptions): HttpClient {
  const root = baseUrl.replace(/\/+$/, '')

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers = new Headers()
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (body !== undefined) headers.set('Content-Type', 'application/json')

    let response: Response
    try {
      response = await fetchFn(`${root}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new NetworkError()
    }

    if (!response.ok) throw new ApiError(response.status, await errorMessage(response))
    return (await response.json()) as T
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
  }
}
