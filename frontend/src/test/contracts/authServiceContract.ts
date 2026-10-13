import type { User } from '@/domain/user'
import type { AuthService } from '@/features/auth/services/authService'

export interface TestAccount {
  user: User
  password: string
}

export const TEST_ACCOUNT: TestAccount = {
  user: { name: 'María López', email: 'docente@colegio.edu', role: 'docente' },
  password: 'Docente#2026',
}

// Comportamiento que toda implementación de AuthService debe cumplir
export function describeAuthServiceContract(createService: (account: TestAccount) => AuthService) {
  describe('contrato de AuthService', () => {
    const { user, password } = TEST_ACCOUNT

    it('devuelve el usuario con su rol si las credenciales son correctas', async () => {
      const service = createService(TEST_ACCOUNT)

      await expect(service.login({ email: user.email, password })).resolves.toEqual(user)
    })

    it('ignora mayúsculas en el correo', async () => {
      const service = createService(TEST_ACCOUNT)

      await expect(service.login({ email: 'Docente@Colegio.edu', password })).resolves.toEqual(user)
    })

    it('rechaza una contraseña incorrecta con un mensaje genérico', async () => {
      const service = createService(TEST_ACCOUNT)

      await expect(service.login({ email: user.email, password: 'Otra#12345' })).rejects.toThrow(
        'Credenciales incorrectas',
      )
    })

    it('rechaza un correo desconocido con el mismo mensaje genérico', async () => {
      const service = createService(TEST_ACCOUNT)

      await expect(service.login({ email: 'nadie@colegio.edu', password })).rejects.toThrow(
        'Credenciales incorrectas',
      )
    })

    it('no hay usuario actual sin haber iniciado sesión', async () => {
      await expect(createService(TEST_ACCOUNT).getCurrentUser()).resolves.toBeNull()
    })

    it('recuerda al usuario tras iniciar sesión', async () => {
      const service = createService(TEST_ACCOUNT)

      await service.login({ email: user.email, password })

      await expect(service.getCurrentUser()).resolves.toEqual(user)
    })

    it('un login fallido no abre sesión', async () => {
      const service = createService(TEST_ACCOUNT)

      await service.login({ email: user.email, password: 'Otra#12345' }).catch(() => {})

      await expect(service.getCurrentUser()).resolves.toBeNull()
    })

    it('cerrar sesión olvida al usuario', async () => {
      const service = createService(TEST_ACCOUNT)
      await service.login({ email: user.email, password })

      await service.logout()

      await expect(service.getCurrentUser()).resolves.toBeNull()
    })
  })
}
