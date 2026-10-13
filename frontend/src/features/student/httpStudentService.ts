import type { StudentLessonSummary } from '../../domain/lesson'
import { DEFAULT_PDF_FILENAME, toLessonSummary, type ApiLessonSummary, type ApiPdfRef } from '../../http/apiLessons'
import type { HttpClient } from '../../http/httpClient'
import type { StudentService } from './studentService'

// docs/openapi.yaml, schema StudentLessonSummary
interface ApiStudentLessonSummary extends ApiLessonSummary {
  pdf: ApiPdfRef
}

function toStudentLessonSummary(lesson: ApiStudentLessonSummary): StudentLessonSummary {
  return { ...toLessonSummary(lesson), pdfFilename: lesson.pdf.filename }
}

export function createHttpStudentService(http: HttpClient): StudentService {
  return {
    async getMyLessons() {
      const lessons = await http.get<ApiStudentLessonSummary[]>('/students/me/lessons')
      return lessons.map(toStudentLessonSummary)
    },
    async downloadPdf(lessonId) {
      const { blob, filename } = await http.getBlob(`/students/me/lessons/${encodeURIComponent(lessonId)}/pdf`)
      return { blob, filename: filename ?? DEFAULT_PDF_FILENAME }
    },
  }
}
