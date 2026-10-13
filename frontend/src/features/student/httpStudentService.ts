import type { StudentLessonSummary } from '../../domain/lesson'
import { DEFAULT_PDF_FILENAME, toLessonSummary, type ApiLessonSummary, type ApiPdfRef } from '../../http/apiLessons'
import type { HttpClient } from '../../http/httpClient'
import { toStudentMaterial, type ApiStudentMaterial } from '../../http/apiStudentMaterial'
import type { StudentService } from './studentService'

// docs/openapi.yaml, schema StudentLessonSummary
interface ApiStudentLessonSummary extends ApiLessonSummary {
  pdf: ApiPdfRef
}

function toStudentLessonSummary(lesson: ApiStudentLessonSummary): StudentLessonSummary {
  return { ...toLessonSummary(lesson), pdfFilename: lesson.pdf.filename }
}

function lessonPath(lessonId: string): string {
  return `/students/me/lessons/${encodeURIComponent(lessonId)}`
}

export function createHttpStudentService(http: HttpClient): StudentService {
  return {
    async getMyLessons() {
      const lessons = await http.get<ApiStudentLessonSummary[]>('/students/me/lessons')
      return lessons.map(toStudentLessonSummary)
    },
    async downloadPdf(lessonId) {
      const { blob, filename } = await http.getBlob(`${lessonPath(lessonId)}/pdf`)
      return { blob, filename: filename ?? DEFAULT_PDF_FILENAME }
    },
    async getMaterial(lessonId) {
      return toStudentMaterial(await http.get<ApiStudentMaterial>(`${lessonPath(lessonId)}/material`))
    },
  }
}
