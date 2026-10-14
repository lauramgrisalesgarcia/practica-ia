import type { StudentLessonSummary, StudentMaterial } from '@/domain/lesson'
import { answersAreValid, gradeFakeSubmission, INVALID_ANSWERS_MESSAGE } from '@/dev/fakeGrading'
import { wait } from '@/dev/wait'
import type { StudentService } from './studentService'

interface MockStudentServiceOptions {
  // Clases del estudiante con sesión iniciada
  lessons: StudentLessonSummary[]
  // Material por id de clase; una clase que no aparece no tiene material
  materials: Record<string, StudentMaterial>
  // Respuesta correcta de cada ejercicio por id de clase
  answerKeys: Record<string, Record<number, string>>
  // Contenido de prueba del PDF de todas las clases
  pdfContent: string
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockStudentService({
  lessons,
  materials,
  answerKeys,
  pdfContent,
  delayMs = 500,
}: MockStudentServiceOptions): StudentService {
  let currentLessons = lessons
  const materialsById = new Map(Object.entries(materials))

  function findLesson(lessonId: string): StudentLessonSummary {
    const lesson = currentLessons.find((l) => l.id === lessonId)
    if (!lesson) throw new Error('Clase no encontrada')
    return lesson
  }

  function findMaterial(lessonId: string): StudentMaterial {
    findLesson(lessonId)
    const material = materialsById.get(lessonId)
    if (!material) throw new Error('La clase no tiene material de refuerzo')
    return material
  }

  return {
    async getMyLessons() {
      await wait(delayMs)
      return currentLessons
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
    async getMaterial(lessonId) {
      await wait(delayMs)
      return findMaterial(lessonId)
    },
    async submitMaterial(lessonId, answers) {
      await wait(delayMs)
      const material = findMaterial(lessonId)
      if (material.submission) throw new Error('El material ya fue resuelto')
      if (!answersAreValid(material, answers)) throw new Error(INVALID_ANSWERS_MESSAGE)
      const submission = gradeFakeSubmission(answers, answerKeys[lessonId])
      materialsById.set(lessonId, { ...material, submission })
      currentLessons = currentLessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, materialStatus: 'completed', score: submission.score } : lesson,
      )
      return submission
    },
  }
}
