import type { LessonSummary } from '../../domain/lesson'
import type { TeacherLessonService } from '../../features/lessons/teacherLessonService'

export const EMMA_ID = '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83'
export const UNKNOWN_STUDENT_ID = '00000000-0000-4000-8000-000000000000'

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

// Clases por alumno; un alumno que no aparece no está asignado al docente
export type LessonsByStudent = Record<string, LessonSummary[]>

// Comportamiento que toda implementación de TeacherLessonService debe cumplir
export function describeTeacherLessonServiceContract(createService: (lessons: LessonsByStudent) => TeacherLessonService) {
  describe('contrato de TeacherLessonService', () => {
    it('devuelve el historial de clases del alumno', async () => {
      await expect(createService({ [EMMA_ID]: EMMA_LESSONS }).getStudentLessons(EMMA_ID)).resolves.toEqual(EMMA_LESSONS)
    })

    it('devuelve una lista vacía si el alumno aún no tiene clases', async () => {
      await expect(createService({ [EMMA_ID]: [] }).getStudentLessons(EMMA_ID)).resolves.toEqual([])
    })

    it('rechaza un alumno inexistente o asignado a otro docente', async () => {
      await expect(createService({ [EMMA_ID]: EMMA_LESSONS }).getStudentLessons(UNKNOWN_STUDENT_ID)).rejects.toThrow(
        'Estudiante no encontrado',
      )
    })
  })
}
