import { errorMessage } from './errorMessage'

describe('errorMessage', () => {
  it('usa el mensaje del error', () => {
    expect(errorMessage(new Error('Sin conexión'), 'No se pudo cargar')).toBe('Sin conexión')
  })

  it('usa el texto alternativo si lo lanzado no es un Error', () => {
    expect(errorMessage('fallo', 'No se pudo cargar')).toBe('No se pudo cargar')
  })
})
