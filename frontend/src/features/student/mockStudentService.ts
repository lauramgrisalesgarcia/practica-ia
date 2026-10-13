import type { StudentLessonSummary, StudentMaterial } from '../../domain/lesson'
import { wait } from '../../dev/wait'
import type { StudentService } from './studentService'

interface MockStudentServiceOptions {
  // Clases del estudiante con sesión iniciada
  lessons: StudentLessonSummary[]
  // Material por id de clase; una clase que no aparece no tiene material
  materials: Record<string, StudentMaterial>
  // Contenido de prueba del PDF de todas las clases
  pdfContent: string
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockStudentService({
  lessons,
  materials,
  pdfContent,
  delayMs = 500,
}: MockStudentServiceOptions): StudentService {
  function findLesson(lessonId: string): StudentLessonSummary {
    const lesson = lessons.find((l) => l.id === lessonId)
    if (!lesson) throw new Error('Clase no encontrada')
    return lesson
  }

  return {
    async getMyLessons() {
      await wait(delayMs)
      return lessons
    },
    async downloadPdf(lessonId) {
      await wait(delayMs)
      const { pdfFilename } = findLesson(lessonId)
      return { blob: new Blob([pdfContent], { type: 'application/pdf' }), filename: pdfFilename }
    },
    async getMaterial(lessonId) {
      await wait(delayMs)
      findLesson(lessonId)
      if (!Object.hasOwn(materials, lessonId)) throw new Error('La clase no tiene material de refuerzo')
      return materials[lessonId]
    },
  }
}
