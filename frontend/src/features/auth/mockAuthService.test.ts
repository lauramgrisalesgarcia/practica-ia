import { createMockAuthService } from './mockAuthService'

describe('mockAuthService', () => {
  const users = [
    {
      user: { name: 'María López', email: 'docente@colegio.edu', role: 'docente' as const },
      password: 'Docente#2026',
    },
  ]
  const students = { 'docente@colegio.edu': [{ id: 1, name: 'Ana Gómez', email: 'ana@colegio.edu' }] }

  it('devuelve el usuario con su rol si las credenciales son correctas', async () => {
    const service = createMockAuthService({ users, students, delayMs: 0 })

    await expect(
      service.login({ email: 'docente@colegio.edu', password: 'Docente#2026' }),
    ).resolves.toEqual(users[0].user)
  })

  it('ignora mayúsculas en el correo', async () => {
    const service = createMockAuthService({ users, students, delayMs: 0 })

    await expect(
      service.login({ email: 'Docente@Colegio.edu', password: 'Docente#2026' }),
    ).resolves.toEqual(users[0].user)
  })

  it('rechaza una contraseña incorrecta', async () => {
    const service = createMockAuthService({ users, students, delayMs: 0 })

    await expect(
      service.login({ email: 'docente@colegio.edu', password: 'Otra#12345' }),
    ).rejects.toThrow('Credenciales incorrectas')
  })

  it('devuelve los alumnos asignados al docente', async () => {
    const service = createMockAuthService({ users, students, delayMs: 0 })
    const teacher = await service.login({ email: 'docente@colegio.edu', password: 'Docente#2026' })

    await expect(service.getAssignedStudents(teacher)).resolves.toEqual(students['docente@colegio.edu'])
  })
})
