import { createMockAuthService } from '../features/auth/mockAuthService'
import { createMockTeacherService } from '../features/teacher/mockTeacherService'

// Datos de prueba para desarrollo local (no son credenciales reales)
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
})

export const devTeacherService = createMockTeacherService({
  students: [
    {
      id: 'b71e4a90-2c5d-4f3e-8a1b-6d7c8e9f0a12',
      name: 'Ana Gómez',
      email: 'estudiante@colegio.edu',
      nativeLanguage: 'en',
      level: 'B1',
    },
    {
      id: '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83',
      name: 'Luis Pérez',
      email: 'luis@colegio.edu',
      nativeLanguage: 'de',
      level: 'A2',
    },
    {
      id: '5c8d2e7f-1a3b-4c9d-8e6f-2b4a7c9d1e3f',
      name: 'Sofía Ramírez',
      email: 'sofia@colegio.edu',
      nativeLanguage: 'fr',
      level: 'C1',
    },
  ],
})
