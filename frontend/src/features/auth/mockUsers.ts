import { createMockAuthService } from './mockAuthService'

// Usuarios de prueba para desarrollo local (no son credenciales reales)
export const devAuthService = createMockAuthService({
  users: [
    {
      user: { name: 'María López', email: 'docente@colegio.edu', role: 'docente' },
      password: 'Docente#2026',
    },
    {
      user: { name: 'Ana Gómez', email: 'estudiante@colegio.edu', role: 'estudiante' },
      password: 'Estudiante#2026',
    },
  ],
  students: {
    'docente@colegio.edu': [
      { id: 1, name: 'Ana Gómez', email: 'estudiante@colegio.edu' },
      { id: 2, name: 'Luis Pérez', email: 'luis@colegio.edu' },
      { id: 3, name: 'Sofía Ramírez', email: 'sofia@colegio.edu' },
    ],
  },
})
