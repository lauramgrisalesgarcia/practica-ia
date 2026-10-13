import type { LessonDetail, LessonSummary } from '../../domain/lesson'
import { buildFakeMaterial, materialGenerationError } from '../../dev/fakeMaterial'
import { wait } from '../../dev/wait'
import type { TeacherLessonService } from './teacherLessonService'

interface MockTeacherLessonServiceOptions {
  // Clases por id de alumno; un alumno que no aparece no está asignado al docente
  lessonsByStudent: Record<string, LessonSummary[]>
  // Detalle de cada clase del docente
  lessons: LessonDetail[]
  // Contenido de prueba del PDF de todas las clases
  pdfContent: string
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockTeacherLessonService({
  lessonsByStudent,
  lessons,
  pdfContent,
  delayMs = 500,
}: MockTeacherLessonServiceOptions): TeacherLessonService {
  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))

  function findLesson(lessonId: string): LessonDetail {
    const lesson = lessonsById.get(lessonId)
    if (!lesson) throw new Error('Clase no encontrada')
    return lesson
  }

  return {
    async getStudentLessons(studentId) {
      await wait(delayMs)
      if (!Object.hasOwn(lessonsByStudent, studentId)) throw new Error('Estudiante no encontrado')
      return lessonsByStudent[studentId].map((summary) => {
        const lesson = lessonsById.get(summary.id)
        return lesson ? { ...summary, materialStatus: lesson.materialStatus } : summary
      })
    },
    async getLesson(lessonId) {
      await wait(delayMs)
      return findLesson(lessonId)
    },
    async downloadPdf(lessonId) {
      await wait(delayMs)
      const { pdfFilename } = findLesson(lessonId)
      return { blob: new Blob([pdfContent], { type: 'application/pdf' }), filename: pdfFilename }
    },
    async generateMaterial(lessonId, request) {
      await wait(delayMs)
      const lesson = findLesson(lessonId)
      const error = materialGenerationError(lesson)
      if (error) throw new Error(error)
      const material = buildFakeMaterial(lesson, request)
      lessonsById.set(lessonId, { ...lesson, material, materialStatus: 'pending' })
      return material
    },
  }
}
