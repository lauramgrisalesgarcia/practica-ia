import { createBrowserTokenStorage } from './tokenStorage'

describe('browserTokenStorage', () => {
  beforeEach(() => sessionStorage.clear())

  it('no devuelve token si no se ha guardado ninguno', () => {
    expect(createBrowserTokenStorage().get()).toBeNull()
  })

  it('guarda el token y lo devuelve', () => {
    const storage = createBrowserTokenStorage()

    storage.set('token-de-prueba')

    expect(storage.get()).toBe('token-de-prueba')
  })

  it('borra el token', () => {
    const storage = createBrowserTokenStorage()
    storage.set('token-de-prueba')

    storage.clear()

    expect(storage.get()).toBeNull()
  })

  it('usa sessionStorage por defecto para que el token sobreviva a recargar la página', () => {
    createBrowserTokenStorage().set('token-de-prueba')

    expect(createBrowserTokenStorage().get()).toBe('token-de-prueba')
    expect(localStorage.length).toBe(0)
  })

  it('acepta otro Storage inyectado', () => {
    const storage = createBrowserTokenStorage(localStorage)

    storage.set('token-de-prueba')

    expect(localStorage.length).toBe(1)
    expect(sessionStorage.length).toBe(0)
    localStorage.clear()
  })
})
