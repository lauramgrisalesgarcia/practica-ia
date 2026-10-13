import type { LessonSummary, MaterialStatus } from '@/domain/lesson'

// Formas de la API compartidas por las vistas del docente y del estudiante (docs/openapi.yaml)

// schema LessonBase
export interface ApiLessonSummary {
  id: string
  date: string
  duration_minutes: number
  topic: string
  context: string
  material_status: MaterialStatus
}

// schema PdfRef
export interface ApiPdfRef {
  filename: string
  url: string
}

// Nombre del PDF si el back no lo indica en Content-Disposition
export const DEFAULT_PDF_FILENAME = 'clase.pdf'

export function toLessonSummary({
  id,
  date,
  duration_minutes,
  topic,
  context,
  material_status,
}: ApiLessonSummary): LessonSummary {
  return { id, date, durationMinutes: duration_minutes, topic, context, materialStatus: material_status }
}
