import { useCallback } from 'react'
import { Link } from 'react-router'
import type { LessonPdf, TeacherLessonSummary } from '@/domain/lesson'
import { PdfDownloadButton } from '@/shared/components/PdfDownloadButton'
import { LessonTimeline } from '@/shared/lessonHistory/LessonTimeline'
import { generateMaterialPath, lessonDetailPath } from '@/shared/routes/paths'

interface StudentLessonsProps {
  studentId: string
  // Debe ser una referencia estable: cada cambio vuelve a cargar el historial
  loadLessons: (studentId: string) => Promise<TeacherLessonSummary[]>
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  openPdf: (pdf: LessonPdf) => void
  today?: Date
  // Zona horaria para agrupar por mes (por defecto, la del navegador)
  timeZone?: string
}

// Historial de un alumno visto por su docente
export function StudentLessons({ studentId, loadLessons, downloadPdf, openPdf, today, timeZone }: StudentLessonsProps) {
  const loadStudentLessons = useCallback(() => loadLessons(studentId), [loadLessons, studentId])

  return (
    <LessonTimeline
      loadLessons={loadStudentLessons}
      emptyMessage="Este alumno aún no tiene clases realizadas."
      today={today}
      timeZone={timeZone}
      renderActions={(lesson) => (
        <>
          <Link
            to={lessonDetailPath(lesson.id)}
            className="rounded-md bg-ocean px-3 py-1.5 text-sm font-medium text-white hover:bg-ink"
          >
            Ver clase
          </Link>
          {lesson.materialStatus === 'none' && (
            <Link
              to={generateMaterialPath(lesson.id)}
              className="rounded-md border border-rose px-3 py-1.5 text-sm font-medium text-ocean hover:bg-cream"
            >
              Generar material
            </Link>
          )}
          <PdfDownloadButton lessonId={lesson.id} downloadPdf={downloadPdf} openPdf={openPdf} />
        </>
      )}
    />
  )
}
