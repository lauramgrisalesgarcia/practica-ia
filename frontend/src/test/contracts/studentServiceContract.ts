import type { StudentLessonSummary } from '../../domain/lesson'
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
]

export interface StudentFixtures {
  // Clases del estudiante con sesión; todas comparten PDF_CONTENT como contenido del PDF
  lessons: StudentLessonSummary[]
}

export const DEFAULT_STUDENT_FIXTURES: StudentFixtures = { lessons: MY_LESSONS }

// Comportamiento que toda implementación de StudentService debe cumplir
export function describeStudentServiceContract(createService: (fixtures: StudentFixtures) => StudentService) {
  describe('contrato de StudentService', () => {
    it('devuelve las clases del estudiante', async () => {
      await expect(createService(DEFAULT_STUDENT_FIXTURES).getMyLessons()).resolves.toEqual(MY_LESSONS)
    })

    it('devuelve una lista vacía si el estudiante aún no tiene clases', async () => {
      await expect(createService({ lessons: [] }).getMyLessons()).resolves.toEqual([])
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
  })
}
