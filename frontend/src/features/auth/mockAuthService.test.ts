import { createMockAuthService } from './mockAuthService'

describe('mockAuthService', () => {
  const users = [
    {
      user: { name: 'María López', email: 'docente@colegio.edu', role: 'docente' as const },
      password: 'Docente#2026',
    },
  ]

  it('devuelve el usuario con su rol si las credenciales son correctas', async () => {
    const service = createMockAuthService({ users, delayMs: 0 })

    await expect(
      service.login({ email: 'docente@colegio.edu', password: 'Docente#2026' }),
    ).resolves.toEqual(users[0].user)
  })

  it('ignora mayúsculas en el correo', async () => {
    const service = createMockAuthService({ users, delayMs: 0 })

    await expect(
      service.login({ email: 'Docente@Colegio.edu', password: 'Docente#2026' }),
    ).resolves.toEqual(users[0].user)
  })

  it('rechaza una contraseña incorrecta', async () => {
    const service = createMockAuthService({ users, delayMs: 0 })

    await expect(
      service.login({ email: 'docente@colegio.edu', password: 'Otra#12345' }),
    ).rejects.toThrow('Credenciales incorrectas')
  })

})
