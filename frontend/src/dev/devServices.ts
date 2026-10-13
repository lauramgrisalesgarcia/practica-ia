import { createMockAuthService } from '../features/auth/mockAuthService'
import { createMockTeacherLessonService } from '../features/lessons/mockTeacherLessonService'
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
      lessonsCount: 8,
    },
    {
      id: '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83',
      name: 'Luis Pérez',
      email: 'luis@colegio.edu',
      nativeLanguage: 'de',
      level: 'A2',
      lessonsCount: 12,
    },
    {
      id: '5c8d2e7f-1a3b-4c9d-8e6f-2b4a7c9d1e3f',
      name: 'Sofía Ramírez',
      email: 'sofia@colegio.edu',
      nativeLanguage: 'fr',
      level: 'C1',
      lessonsCount: 3,
    },
  ],
})

export const devTeacherLessonService = createMockTeacherLessonService({
  lessons: {
    'b71e4a90-2c5d-4f3e-8a1b-6d7c8e9f0a12': [
      {
        id: 'c4a9e2d7-5f1b-4c8e-a3d6-7b2e9f0c1d45',
        date: '2026-10-08T16:00:00Z',
        durationMinutes: 60,
        topic: 'Pedir en un restaurante',
        context: 'Pedir comida y bebida en un restaurante y pedir la cuenta',
        materialStatus: 'completed',
      },
      {
        id: '1e7d3b5a-8c2f-4a6e-9d0b-3f5a7c9e1b28',
        date: '2026-10-01T16:00:00Z',
        durationMinutes: 60,
        topic: 'Presentarse',
        context: 'Presentarse y hablar de la familia en una reunión',
        materialStatus: 'none',
      },
    ],
    '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83': [],
    '5c8d2e7f-1a3b-4c9d-8e6f-2b4a7c9d1e3f': [
      {
        id: '7a1c3e5b-9d2f-4b6a-8c0e-2d4f6a8b0c13',
        date: '2026-10-06T15:00:00Z',
        durationMinutes: 45,
        topic: 'Hablar del fin de semana',
        context: 'Contar lo que hiciste el fin de semana a un compañero',
        materialStatus: 'pending',
      },
    ],
  },
})
