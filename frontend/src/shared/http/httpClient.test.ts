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

  describe('respuestas binarias', () => {
    it('devuelve el contenido y el nombre del archivo de Content-Disposition', async () => {
      const response = new Response('%PDF-1.4', {
        status: 200,
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="restaurante-a2.pdf"' },
      })
      const { client, fetchFn } = setup({ token: 'token-de-prueba', response })

      const file = await client.getBlob('/teachers/me/lessons/abc/pdf')

      expect(file.filename).toBe('restaurante-a2.pdf')
      expect(file.blob.type).toBe('application/pdf')
      expect(await file.blob.text()).toBe('%PDF-1.4')
      const { url, init, headers } = sentRequest(fetchFn)
      expect(url).toBe('http://api.test/teachers/me/lessons/abc/pdf')
      expect(init.method).toBe('GET')
      expect(headers.get('Authorization')).toBe('Bearer token-de-prueba')
    })

    it('prefiere el nombre UTF-8 (filename*) cuando el back lo envía', async () => {
      const response = new Response('x', {
        status: 200,
        headers: { 'Content-Disposition': `inline; filename="cumplea_os.pdf"; filename*=UTF-8''cumplea%C3%B1os.pdf` },
      })
      const { client } = setup({ response })

      await expect(client.getBlob('/archivo')).resolves.toMatchObject({ filename: 'cumpleaños.pdf' })
    })

    it('usa el nombre ASCII si el nombre UTF-8 está mal codificado', async () => {
      const response = new Response('x', {
        status: 200,
        headers: { 'Content-Disposition': `inline; filename="clase.pdf"; filename*=UTF-8''%E0%A4%A.pdf` },
      })
      const { client } = setup({ response })

      await expect(client.getBlob('/archivo')).resolves.toMatchObject({ filename: 'clase.pdf' })
    })

    it('no devuelve nombre si la respuesta no trae Content-Disposition', async () => {
      const { client } = setup({ response: new Response('x', { status: 200 }) })

      await expect(client.getBlob('/archivo')).resolves.toMatchObject({ filename: null })
    })

    it('no devuelve nombre si Content-Disposition no lo incluye', async () => {
      const response = new Response('x', { status: 200, headers: { 'Content-Disposition': 'inline' } })
      const { client } = setup({ response })

      await expect(client.getBlob('/archivo')).resolves.toMatchObject({ filename: null })
    })

    it('traduce los errores igual que las peticiones JSON', async () => {
      const { client } = setup({ response: jsonResponse(404, { detail: 'El PDF de la clase no está disponible' }) })

      await expect(client.getBlob('/archivo')).rejects.toEqual(new ApiError(404, 'El PDF de la clase no está disponible'))
    })
  })
})
