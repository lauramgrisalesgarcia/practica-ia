import { ApiError, NetworkError } from './errors'

export interface DownloadedFile {
  blob: Blob
  // Nombre indicado por el back en Content-Disposition, o null si no lo indica
  filename: string | null
}

export interface HttpClient {
  get: <T>(path: string) => Promise<T>
  post: <T>(path: string, body: unknown) => Promise<T>
  getBlob: (path: string) => Promise<DownloadedFile>
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

// RFC 6266: filename*=UTF-8''<codificado> tiene prioridad sobre filename="<ascii>"
function filenameFrom(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim())
    } catch {
      // Codificación inválida: se usa el nombre ASCII
    }
  }
  return /filename="([^"]*)"/i.exec(contentDisposition)?.[1] ?? null
}

export function createHttpClient({ baseUrl, getToken, fetchFn = fetch }: HttpClientOptions): HttpClient {
  const root = baseUrl.replace(/\/+$/, '')

  async function send(method: string, path: string, body?: unknown): Promise<Response> {
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
    return response
  }

  async function requestJson<T>(method: string, path: string, body?: unknown): Promise<T> {
    return (await (await send(method, path, body)).json()) as T
  }

  return {
    get: (path) => requestJson('GET', path),
    post: (path, body) => requestJson('POST', path, body),
    async getBlob(path) {
      const response = await send('GET', path)
      return { blob: await response.blob(), filename: filenameFrom(response.headers.get('Content-Disposition')) }
    },
  }
}
