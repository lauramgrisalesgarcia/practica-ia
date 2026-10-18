import { createBrowserTokenStorage } from './tokenStorage'

const TOKEN = 'token-de-prueba'

describe('browserTokenStorage', () => {
  beforeEach(() => sessionStorage.clear())

  it('no devuelve token si no se ha guardado ninguno', () => {
    expect(createBrowserTokenStorage().get()).toBeNull()
  })

  it('guarda el token y lo devuelve', () => {
    const storage = createBrowserTokenStorage()

    storage.set(TOKEN)

    expect(storage.get()).toBe(TOKEN)
  })

  it('borra el token', () => {
    const storage = createBrowserTokenStorage()
    storage.set(TOKEN)

    storage.clear()

    expect(storage.get()).toBeNull()
  })

  it('usa sessionStorage por defecto para que el token sobreviva a recargar la página', () => {
    createBrowserTokenStorage().set(TOKEN)

    expect(createBrowserTokenStorage().get()).toBe(TOKEN)
    expect(localStorage.length).toBe(0)
  })

  it('acepta otro Storage inyectado', () => {
    const storage = createBrowserTokenStorage(localStorage)

    storage.set(TOKEN)

    expect(localStorage.length).toBe(1)
    expect(sessionStorage.length).toBe(0)
    localStorage.clear()
  })
})
