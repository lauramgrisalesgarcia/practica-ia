import type { LessonDetail, LessonSummary, StudentMaterial, StudentSubmission } from '@/domain/lesson'
import { createMockAuthService } from '@/features/auth/services/mockAuthService'
import { createMockTeacherLessonService } from '@/features/teacher/services/mockTeacherLessonService'
import { createMockStudentService } from '@/features/student/services/mockStudentService'
import { createMockTeacherService } from '@/features/teacher/services/mockTeacherService'

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

// No es un PDF real: solo sirve para probar la descarga sin backend
const DEV_PDF_CONTENT = '%PDF-1.4 PDF de prueba'

const ANA = { id: 'b71e4a90-2c5d-4f3e-8a1b-6d7c8e9f0a12', name: 'Ana Gómez', nativeLanguage: 'en', level: 'B1' } as const
const SOFIA = { id: '5c8d2e7f-1a3b-4c9d-8e6f-2b4a7c9d1e3f', name: 'Sofía Ramírez', nativeLanguage: 'fr', level: 'C1' } as const

const devLessons: LessonDetail[] = [
  {
    id: 'c4a9e2d7-5f1b-4c8e-a3d6-7b2e9f0c1d45',
    date: '2026-10-08T16:00:00Z',
    durationMinutes: 60,
    topic: 'Pedir en un restaurante',
    context: 'Pedir comida y bebida en un restaurante y pedir la cuenta',
    materialStatus: 'completed',
    keywords: ['la carta', 'quisiera', 'de primero', 'la cuenta'],
    notes: "Confunde 'quiero' y 'quisiera'.",
    pdfFilename: 'restaurante-b1.pdf',
    student: ANA,
    material: {
      generatedAt: '2026-10-09T10:30:00Z',
      activityType: 'complete_sentence',
      title: 'En el restaurante',
      instructions: 'Completa cada frase con la opción correcta.',
      exercises: [
        {
          id: 1,
          sentence: 'Camarero, ¿nos trae ___, por favor? Queremos ver los platos.',
          options: ['la carta', 'la cuenta', 'la mesa'],
          correctOption: 'la carta',
        },
        {
          id: 2,
          sentence: 'Buenas noches. ___ una mesa para dos personas.',
          options: ['Quisiera', 'Quiero que', 'Quería que'],
          correctOption: 'Quisiera',
        },
      ],
    },
    submission: { submittedAt: '2026-10-10T18:05:00Z', correctCount: 1, incorrectCount: 1, score: 50 },
  },
  {
    id: '1e7d3b5a-8c2f-4a6e-9d0b-3f5a7c9e1b28',
    date: '2026-10-01T16:00:00Z',
    durationMinutes: 60,
    topic: 'Presentarse',
    context: 'Presentarse y hablar de la familia en una reunión',
    materialStatus: 'none',
    keywords: ['me llamo', 'mi familia', 'tengo'],
    notes: null,
    pdfFilename: 'presentarse-b1.pdf',
    student: ANA,
    material: null,
    submission: null,
  },
  {
    id: '7a1c3e5b-9d2f-4b6a-8c0e-2d4f6a8b0c13',
    date: '2026-10-06T15:00:00Z',
    durationMinutes: 45,
    topic: 'Hablar del fin de semana',
    context: 'Contar lo que hiciste el fin de semana a un compañero',
    materialStatus: 'pending',
    keywords: ['el sábado', 'fui', 'me quedé'],
    notes: 'Repasar el pretérito indefinido de ir y quedarse.',
    pdfFilename: 'fin-de-semana-c1.pdf',
    student: SOFIA,
    material: {
      generatedAt: '2026-10-07T09:00:00Z',
      activityType: 'complete_sentence',
      title: 'Mi fin de semana',
      instructions: 'Completa cada frase con la opción correcta.',
      exercises: [
        {
          id: 1,
          sentence: 'El sábado ___ al cine con mis amigos.',
          options: ['fui', 'iba', 'voy'],
          correctOption: 'fui',
        },
      ],
    },
    submission: null,
  },
]

function toSummary({ id, date, durationMinutes, topic, context, materialStatus }: LessonDetail): LessonSummary {
  return { id, date, durationMinutes, topic, context, materialStatus }
}

function lessonsOf(studentId: string): LessonSummary[] {
  return devLessons
    .filter((lesson) => lesson.student.id === studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(toSummary)
}

export const devTeacherLessonService = createMockTeacherLessonService({
  lessonsByStudent: {
    [ANA.id]: lessonsOf(ANA.id),
    '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83': [],
    [SOFIA.id]: lessonsOf(SOFIA.id),
  },
  lessons: devLessons,
  pdfContent: DEV_PDF_CONTENT,
})

// Resultado de prueba coherente con el resumen del docente: acierta los primeros ejercicios
function toStudentSubmission({ material, submission }: LessonDetail): StudentSubmission | null {
  if (!material || !submission) return null
  return {
    ...submission,
    results: material.exercises.map((exercise, index) => {
      const isCorrect = index < submission.correctCount
      const wrongOption = exercise.options.find((option) => option !== exercise.correctOption) ?? exercise.correctOption
      return {
        exerciseId: exercise.id,
        selectedOption: isCorrect ? exercise.correctOption : wrongOption,
        correctOption: exercise.correctOption,
        isCorrect,
      }
    }),
    feedback: 'Buen trabajo. Repasa las frases que fallaste.',
    recommendations: ['Usa «quisiera» para pedir algo de forma cortés.'],
  }
}

// Material tal como lo ve el estudiante: sin las respuestas correctas
function toStudentMaterial(lesson: LessonDetail): StudentMaterial | null {
  if (!lesson.material) return null
  const { activityType, title, instructions, exercises } = lesson.material
  return {
    lessonId: lesson.id,
    activityType,
    title,
    instructions,
    exercises: exercises.map(({ id, sentence, options }) => ({ id, sentence, options })),
    submission: toStudentSubmission(lesson),
  }
}

const anaLessons = devLessons.filter((lesson) => lesson.student.id === ANA.id)

// Clases de Ana Gómez (estudiante@colegio.edu), la estudiante de desarrollo
export const devStudentService = createMockStudentService({
  answerKeys: Object.fromEntries(
    anaLessons.map((lesson) => [
      lesson.id,
      Object.fromEntries((lesson.material?.exercises ?? []).map((exercise) => [exercise.id, exercise.correctOption])),
    ]),
  ),
  materials: Object.fromEntries(
    anaLessons.flatMap((lesson) => {
      const material = toStudentMaterial(lesson)
      return material ? [[lesson.id, material]] : []
    }),
  ),
  lessons: anaLessons
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((lesson) => ({ ...toSummary(lesson), pdfFilename: lesson.pdfFilename })),
  pdfContent: DEV_PDF_CONTENT,
})
