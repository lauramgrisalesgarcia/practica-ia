import type { LessonDetail, LessonSummary } from '../../domain/lesson'
import type { TeacherLessonService } from '../../features/lessons/teacherLessonService'

export const EMMA_ID = '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83'
export const UNKNOWN_STUDENT_ID = '00000000-0000-4000-8000-000000000000'
export const UNKNOWN_LESSON_ID = '00000000-0000-4000-8000-000000000001'

export const EMMA_LESSONS: LessonSummary[] = [
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
]

const EMMA_AS_LESSON_STUDENT = { id: EMMA_ID, name: 'Emma Schmidt', nativeLanguage: 'de', level: 'A2' } as const

// Clase con material resuelto por el alumno
export const RESTAURANT_LESSON: LessonDetail = {
  ...EMMA_LESSONS[0],
  keywords: ['la carta', 'quisiera', 'la cuenta'],
  notes: "Confunde 'quiero' y 'quisiera'.",
  pdfFilename: 'restaurante-a2.pdf',
  student: EMMA_AS_LESSON_STUDENT,
  material: {
    generatedAt: '2026-10-12T10:30:00Z',
    activityType: 'complete_sentence',
    title: 'En el restaurante',
    instructions: 'Completa cada frase con la opción correcta.',
    exercises: [
      {
        id: 1,
        sentence: 'Camarero, ¿nos trae ___, por favor?',
        options: ['la carta', 'la cuenta', 'la mesa'],
        correctOption: 'la carta',
      },
    ],
  },
  submission: { submittedAt: '2026-10-12T18:05:00Z', correctCount: 1, incorrectCount: 0, score: 100 },
}

// Clase sin material ni notas
export const INTRODUCTIONS_LESSON: LessonDetail = {
  ...EMMA_LESSONS[1],
  keywords: ['me llamo', 'mi familia'],
  notes: null,
  pdfFilename: 'presentarse-a2.pdf',
  student: EMMA_AS_LESSON_STUDENT,
  material: null,
  submission: null,
}

export const PDF_CONTENT = '%PDF-1.4 contenido de prueba'

// Clases por alumno; un alumno que no aparece no está asignado al docente
export type LessonsByStudent = Record<string, LessonSummary[]>

export interface TeacherLessonFixtures {
  lessonsByStudent: LessonsByStudent
  // Detalle de cada clase del docente; todas comparten PDF_CONTENT como contenido del PDF
  lessons: LessonDetail[]
}

export const DEFAULT_FIXTURES: TeacherLessonFixtures = {
  lessonsByStudent: { [EMMA_ID]: EMMA_LESSONS },
  lessons: [RESTAURANT_LESSON, INTRODUCTIONS_LESSON],
}

// Comportamiento que toda implementación de TeacherLessonService debe cumplir
export function describeTeacherLessonServiceContract(createService: (fixtures: TeacherLessonFixtures) => TeacherLessonService) {
  describe('contrato de TeacherLessonService', () => {
    it('devuelve el historial de clases del alumno', async () => {
      await expect(createService(DEFAULT_FIXTURES).getStudentLessons(EMMA_ID)).resolves.toEqual(EMMA_LESSONS)
    })

    it('devuelve una lista vacía si el alumno aún no tiene clases', async () => {
      const service = createService({ ...DEFAULT_FIXTURES, lessonsByStudent: { [EMMA_ID]: [] } })

      await expect(service.getStudentLessons(EMMA_ID)).resolves.toEqual([])
    })

    it('rechaza el historial de un alumno inexistente o asignado a otro docente', async () => {
      await expect(createService(DEFAULT_FIXTURES).getStudentLessons(UNKNOWN_STUDENT_ID)).rejects.toThrow(
        'Estudiante no encontrado',
      )
    })

    it.each([
      ['con material resuelto', RESTAURANT_LESSON],
      ['sin material', INTRODUCTIONS_LESSON],
    ])('devuelve el detalle de una clase %s', async (_, lesson) => {
      await expect(createService(DEFAULT_FIXTURES).getLesson(lesson.id)).resolves.toEqual(lesson)
    })

    it('rechaza el detalle de una clase inexistente o de otro docente', async () => {
      await expect(createService(DEFAULT_FIXTURES).getLesson(UNKNOWN_LESSON_ID)).rejects.toThrow('Clase no encontrada')
    })

    it('descarga el PDF de la clase con su nombre de archivo', async () => {
      const pdf = await createService(DEFAULT_FIXTURES).downloadPdf(RESTAURANT_LESSON.id)

      expect(pdf.filename).toBe('restaurante-a2.pdf')
      expect(await pdf.blob.text()).toBe(PDF_CONTENT)
    })

    it('rechaza el PDF de una clase inexistente o de otro docente', async () => {
      await expect(createService(DEFAULT_FIXTURES).downloadPdf(UNKNOWN_LESSON_ID)).rejects.toThrow('Clase no encontrada')
    })
  })
}
