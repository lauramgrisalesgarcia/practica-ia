import type { LessonSummary } from '../../domain/lesson'
import { wait } from '../../dev/wait'
import type { TeacherLessonService } from './teacherLessonService'

interface MockTeacherLessonServiceOptions {
  // Clases por id de alumno; un alumno que no aparece no está asignado al docente
  lessons: Record<string, LessonSummary[]>
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockTeacherLessonService({
  lessons,
  delayMs = 500,
}: MockTeacherLessonServiceOptions): TeacherLessonService {
  return {
    async getStudentLessons(studentId) {
      await wait(delayMs)
      if (!Object.hasOwn(lessons, studentId)) throw new Error('Estudiante no encontrado')
      return lessons[studentId]
    },
  }
}
