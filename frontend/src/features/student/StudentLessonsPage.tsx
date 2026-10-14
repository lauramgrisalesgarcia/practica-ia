import { Link } from 'react-router'
import type { LessonPdf, StudentLessonSummary } from '@/domain/lesson'
import { PdfDownloadButton } from '@/shared/components/PdfDownloadButton'
import { LessonTimeline } from '@/shared/lessonHistory/LessonTimeline'
import { homePathFor, studentLessonPath } from '@/shared/routes/paths'

interface StudentLessonsPageProps {
  // Debe ser una referencia estable: cada cambio vuelve a cargar el historial
  loadLessons: () => Promise<StudentLessonSummary[]>
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  openPdf: (pdf: LessonPdf) => void
  today?: Date
  // Zona horaria para agrupar por mes (por defecto, la del navegador)
  timeZone?: string
}

export function StudentLessonsPage({ loadLessons, downloadPdf, openPdf, today, timeZone }: StudentLessonsPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link to={homePathFor('estudiante')} className="self-start text-sm font-medium text-ocean hover:text-ink">
        ← Volver a mi panel
      </Link>
      <h1 className="text-2xl font-semibold text-ink">Mis clases</h1>
      <LessonTimeline
        loadLessons={loadLessons}
        emptyMessage="Aún no tienes clases realizadas."
        today={today}
        timeZone={timeZone}
        renderActions={(lesson) => (
          <>
            <Link
              to={studentLessonPath(lesson.id)}
              className="rounded-md bg-ocean px-3 py-1.5 text-sm font-medium text-white hover:bg-ink"
            >
              Ver clase
            </Link>
            <PdfDownloadButton lessonId={lesson.id} downloadPdf={downloadPdf} openPdf={openPdf} />
          </>
        )}
      />
    </div>
  )
}
