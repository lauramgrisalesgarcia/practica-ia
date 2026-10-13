import type { StudentLessonSummary, StudentMaterial } from '../../domain/lesson'
import type { StudentService } from '../../features/student/studentService'

export const UNKNOWN_LESSON_ID = '00000000-0000-4000-8000-000000000001'
export const PDF_CONTENT = '%PDF-1.4 contenido de prueba'

export const MY_LESSONS: StudentLessonSummary[] = [
  {
    id: 'c4a9e2d7-5f1b-4c8e-a3d6-7b2e9f0c1d45',
    date: '2026-10-08T16:00:00Z',
    durationMinutes: 60,
    topic: 'Pedir en un restaurante',
    context: 'Pedir comida y bebida en un restaurante y pedir la cuenta',
    materialStatus: 'pending',
    pdfFilename: 'restaurante-a2.pdf',
  },
  {
    id: '1e7d3b5a-8c2f-4a6e-9d0b-3f5a7c9e1b28',
    date: '2026-10-01T16:00:00Z',
    durationMinutes: 60,
    topic: 'Presentarse',
    context: 'Presentarse y hablar de la familia en una reunión',
    materialStatus: 'none',
    pdfFilename: 'presentarse-a2.pdf',
  },
  {
    id: '6d8f0b2c-4e6a-4c8e-9f1b-3d5f7b9d1f24',
    date: '2026-09-24T16:00:00Z',
    durationMinutes: 45,
    topic: 'Hablar del tiempo',
    context: 'Comentar el tiempo que hace con un vecino',
    materialStatus: 'completed',
    pdfFilename: 'tiempo-a2.pdf',
  },
]

// Material pendiente de resolver de la clase del restaurante
export const PENDING_MATERIAL: StudentMaterial = {
  lessonId: MY_LESSONS[0].id,
  activityType: 'complete_sentence',
  title: 'En el restaurante',
  instructions: 'Completa cada frase con la opción correcta.',
  exercises: [
    { id: 1, sentence: 'Camarero, ¿nos trae ___, por favor?', options: ['la carta', 'la cuenta', 'la mesa'] },
    { id: 2, sentence: 'Buenas noches. ___ una mesa para dos personas.', options: ['Quisiera', 'Quiero que', 'Quería que'] },
  ],
  submission: null,
}

// Material ya resuelto de la clase del tiempo
export const COMPLETED_MATERIAL: StudentMaterial = {
  lessonId: MY_LESSONS[2].id,
  activityType: 'complete_sentence',
  title: '¿Qué tiempo hace?',
  instructions: 'Completa cada frase con la opción correcta.',
  exercises: [
    { id: 1, sentence: 'Hoy ___ mucho calor.', options: ['hace', 'está', 'es'] },
    { id: 2, sentence: 'Mañana va a ___.', options: ['llover', 'lluvia', 'lloviendo'] },
  ],
  submission: {
    submittedAt: '2026-09-25T18:00:00Z',
    correctCount: 1,
    incorrectCount: 1,
    score: 50,
    results: [
      { exerciseId: 1, selectedOption: 'hace', correctOption: 'hace', isCorrect: true },
      { exerciseId: 2, selectedOption: 'lluvia', correctOption: 'llover', isCorrect: false },
    ],
    feedback: 'Bien con «hace calor». Repasa el verbo llover.',
    recommendations: ['Después de «va a» va un verbo en infinitivo: «va a llover».'],
  },
}

export interface StudentFixtures {
  // Clases del estudiante con sesión; todas comparten PDF_CONTENT como contenido del PDF
  lessons: StudentLessonSummary[]
  // Material por id de clase; una clase que no aparece no tiene material
  materials: Record<string, StudentMaterial>
}

export const DEFAULT_STUDENT_FIXTURES: StudentFixtures = {
  lessons: MY_LESSONS,
  materials: { [PENDING_MATERIAL.lessonId]: PENDING_MATERIAL, [COMPLETED_MATERIAL.lessonId]: COMPLETED_MATERIAL },
}

// Comportamiento que toda implementación de StudentService debe cumplir
export function describeStudentServiceContract(createService: (fixtures: StudentFixtures) => StudentService) {
  describe('contrato de StudentService', () => {
    it('devuelve las clases del estudiante', async () => {
      await expect(createService(DEFAULT_STUDENT_FIXTURES).getMyLessons()).resolves.toEqual(MY_LESSONS)
    })

    it('devuelve una lista vacía si el estudiante aún no tiene clases', async () => {
      await expect(createService({ lessons: [], materials: {} }).getMyLessons()).resolves.toEqual([])
    })

    it('descarga el PDF de una de sus clases con su nombre de archivo', async () => {
      const pdf = await createService(DEFAULT_STUDENT_FIXTURES).downloadPdf(MY_LESSONS[0].id)

      expect(pdf.filename).toBe('restaurante-a2.pdf')
      expect(await pdf.blob.text()).toBe(PDF_CONTENT)
    })

    it('rechaza el PDF de una clase inexistente o de otro estudiante', async () => {
      await expect(createService(DEFAULT_STUDENT_FIXTURES).downloadPdf(UNKNOWN_LESSON_ID)).rejects.toThrow(
        'Clase no encontrada',
      )
    })

    it('devuelve el material pendiente sin las respuestas correctas', async () => {
      const material = await createService(DEFAULT_STUDENT_FIXTURES).getMaterial(PENDING_MATERIAL.lessonId)

      expect(material).toEqual(PENDING_MATERIAL)
      for (const exercise of material.exercises) expect(exercise).not.toHaveProperty('correctOption')
    })

    it('devuelve el material resuelto con el resultado del estudiante', async () => {
      await expect(createService(DEFAULT_STUDENT_FIXTURES).getMaterial(COMPLETED_MATERIAL.lessonId)).resolves.toEqual(
        COMPLETED_MATERIAL,
      )
    })

    it('rechaza el material de una clase sin material', async () => {
      await expect(createService(DEFAULT_STUDENT_FIXTURES).getMaterial(MY_LESSONS[1].id)).rejects.toThrow(
        'La clase no tiene material de refuerzo',
      )
    })

    it('rechaza el material de una clase inexistente o de otro estudiante', async () => {
      await expect(createService(DEFAULT_STUDENT_FIXTURES).getMaterial(UNKNOWN_LESSON_ID)).rejects.toThrow(
        'Clase no encontrada',
      )
    })
  })
}
