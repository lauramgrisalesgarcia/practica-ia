import { errorMessage } from './errorMessage'

const FALLBACK = 'No se pudo cargar'

describe('errorMessage', () => {
  it('usa el mensaje del error', () => {
    expect(errorMessage(new Error('Sin conexión'), FALLBACK)).toBe('Sin conexión')
  })

  it('usa el texto alternativo si lo lanzado no es un Error', () => {
    expect(errorMessage('fallo', FALLBACK)).toBe(FALLBACK)
  })
})
