import type { StudentLessonSummary } from '../../domain/lesson'
import { wait } from '../../dev/wait'
import type { StudentService } from './studentService'

interface MockStudentServiceOptions {
  // Clases del estudiante con sesión iniciada
  lessons: StudentLessonSummary[]
  // Contenido de prueba del PDF de todas las clases
  pdfContent: string
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockStudentService({ lessons, pdfContent, delayMs = 500 }: MockStudentServiceOptions): StudentService {
  return {
    async getMyLessons() {
      await wait(delayMs)
      return lessons
    },
    async downloadPdf(lessonId) {
      await wait(delayMs)
      const lesson = lessons.find((l) => l.id === lessonId)
      if (!lesson) throw new Error('Clase no encontrada')
      return { blob: new Blob([pdfContent], { type: 'application/pdf' }), filename: lesson.pdfFilename }
    },
  }
}
