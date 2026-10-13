import { ApiError, NetworkError } from './errors'
import { createHttpClient } from './httpClient'

const BASE_URL = 'http://api.test'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function setup({ token = null, response = jsonResponse(200, {}) }: { token?: string | null; response?: Response } = {}) {
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response)
  const client = createHttpClient({ baseUrl: BASE_URL, getToken: () => token, fetchFn })
  return { client, fetchFn }
}

function sentRequest(fetchFn: ReturnType<typeof setup>['fetchFn']) {
  const [url, init] = fetchFn.mock.calls[0]
  return { url, init: init ?? {}, headers: new Headers(init?.headers) }
}

describe('httpClient', () => {
  describe('errores', () => {
    it.each([401, 403, 404, 409, 502])('traduce un %i a ApiError con el detail del back', async (status) => {
      const { client } = setup({ response: jsonResponse(status, { detail: 'Mensaje del back' }) })

      const error = await client.get('/recurso').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(ApiError)
      expect(error).toMatchObject({ status, message: 'Mensaje del back' })
    })

    it('usa un mensaje genérico cuando el detail no es texto (validación 422)', async () => {
      const { client } = setup({ response: jsonResponse(422, { detail: [{ msg: 'field required' }] }) })

      await expect(client.post('/recurso', {})).rejects.toMatchObject({
        status: 422,
        message: 'Los datos enviados no son válidos',
      })
    })

    it('usa un mensaje genérico cuando la respuesta de error no es JSON', async () => {
      const { client } = setup({ response: new Response('Bad Gateway', { status: 502 }) })

      await expect(client.get('/recurso')).rejects.toMatchObject({
        status: 502,
        message: 'Error inesperado del servidor',
      })
    })

    it('usa un mensaje genérico cuando la respuesta de error no trae detail', async () => {
      const { client } = setup({ response: jsonResponse(500, {}) })

      await expect(client.get('/recurso')).rejects.toMatchObject({
        status: 500,
        message: 'Error inesperado del servidor',
      })
    })

    it('traduce un fallo de red a NetworkError', async () => {
      const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
      const client = createHttpClient({ baseUrl: BASE_URL, getToken: () => null, fetchFn })

      const error = await client.get('/recurso').catch((e: unknown) => e)

      expect(error).toBeInstanceOf(NetworkError)
      expect(error).toHaveProperty('message', 'No se pudo conectar con el servidor')
    })
  })

  describe('peticiones', () => {
    it('hace GET a la URL base más la ruta y devuelve el JSON', async () => {
      const { client, fetchFn } = setup({ response: jsonResponse(200, { status: 'ok' }) })

      await expect(client.get('/health')).resolves.toEqual({ status: 'ok' })

      const { url, init } = sentRequest(fetchFn)
      expect(url).toBe('http://api.test/health')
      expect(init.method).toBe('GET')
    })

    it('hace POST enviando el cuerpo como JSON', async () => {
      const { client, fetchFn } = setup({ response: jsonResponse(201, { id: 'abc' }) })

      await expect(client.post('/recurso', { nombre: 'x' })).resolves.toEqual({ id: 'abc' })

      const { init, headers } = sentRequest(fetchFn)
      expect(init.method).toBe('POST')
      expect(init.body).toBe(JSON.stringify({ nombre: 'x' }))
      expect(headers.get('Content-Type')).toBe('application/json')
    })

    it('envía el token como Authorization Bearer cuando hay sesión', async () => {
      const { client, fetchFn } = setup({ token: 'token-de-prueba' })

      await client.get('/auth/me')

      expect(sentRequest(fetchFn).headers.get('Authorization')).toBe('Bearer token-de-prueba')
    })

    it('no envía Authorization cuando no hay sesión', async () => {
      const { client, fetchFn } = setup({ token: null })

      await client.get('/health')

      expect(sentRequest(fetchFn).headers.has('Authorization')).toBe(false)
    })

    it('lee el token en cada petición, no al crear el cliente', async () => {
      let token: string | null = null
      const fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => jsonResponse(200, {}))
      const client = createHttpClient({ baseUrl: BASE_URL, getToken: () => token, fetchFn })

      token = 'token-nuevo'
      await client.get('/auth/me')

      expect(new Headers(fetchFn.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer token-nuevo')
    })

    it('no duplica la barra entre la URL base y la ruta', async () => {
      const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(200, {}))
      const client = createHttpClient({ baseUrl: 'http://api.test/', getToken: () => null, fetchFn })

      await client.get('/health')

      expect(fetchFn.mock.calls[0][0]).toBe('http://api.test/health')
    })
  })
})
