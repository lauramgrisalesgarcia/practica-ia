import { Link } from 'react-router'
import type { LessonPdf, StudentLessonSummary } from '@/domain/lesson'
import { saveFile } from '@/shared/files/saveFile'
import { homePathFor } from '@/shared/routes/paths'
import { MyLessons } from './components/MyLessons'

interface StudentLessonsPageProps {
  // Debe ser una referencia estable: cada cambio vuelve a cargar el historial
  loadLessons: () => Promise<StudentLessonSummary[]>
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
}

export function StudentLessonsPage({ loadLessons, downloadPdf }: StudentLessonsPageProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link to={homePathFor('estudiante')} className="self-start text-sm font-medium text-ocean hover:text-ink">
        ← Volver a mi panel
      </Link>
      <h1 className="text-2xl font-semibold text-ink">Historial de clases</h1>
      <MyLessons loadLessons={loadLessons} downloadPdf={downloadPdf} openPdf={saveFile} />
    </div>
  )
}
