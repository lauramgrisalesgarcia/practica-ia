import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { LessonPdf, MaterialStatus, TeacherLessonSummary } from '@/domain/lesson'
import { PdfDownloadButton } from '@/shared/components/PdfDownloadButton'
import { formatDate } from '@/shared/i18n/formatDate'
import { generateMaterialPath, lessonDetailPath } from '@/shared/routes/paths'
import {
  filterLessons,
  formatDaysAgo,
  formatDuration,
  formatScore,
  groupByMonth,
  summarizeHistory,
  type MaterialFilter,
} from './lessonHistory'

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

type LessonsState =
  | { status: 'loading' }
  | { status: 'loaded'; lessons: TeacherLessonSummary[] }
  | { status: 'error'; message: string }

const MATERIAL_STATUS: Record<MaterialStatus, { label: string; badge: string; dot: string }> = {
  none: { label: 'Sin material', badge: 'bg-mist text-ink/80', dot: 'border-2 border-ink/30 bg-white' },
  pending: { label: 'Material pendiente', badge: 'bg-teal/20 text-ocean', dot: 'bg-teal' },
  completed: { label: 'Material resuelto', badge: 'bg-mint text-ink', dot: 'bg-ocean' },
}

const FILTERS: { value: MaterialFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'none', label: 'Sin material' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'completed', label: 'Resuelto' },
]

export function StudentLessons({
  studentId,
  loadLessons,
  downloadPdf,
  openPdf,
  today = new Date(),
  timeZone,
}: StudentLessonsProps) {
  const [state, setState] = useState<LessonsState>({ status: 'loading' })
  const [filter, setFilter] = useState<MaterialFilter>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    loadLessons(studentId).then(
      (lessons) => active && setState({ status: 'loaded', lessons }),
      (error: unknown) =>
        active &&
        setState({ status: 'error', message: error instanceof Error ? error.message : 'No se pudo cargar el historial' }),
    )
    return () => {
      active = false
    }
  }, [studentId, loadLessons])

  if (state.status === 'loading') {
    return (
      <Panel>
        <p className="text-sm text-ink/70">Cargando clases…</p>
      </Panel>
    )
  }

  if (state.status === 'error') {
    return (
      <Panel>
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      </Panel>
    )
  }

  const { lessons } = state
  if (lessons.length === 0) {
    return (
      <Panel>
        <p className="text-sm text-ink/70">Este alumno aún no tiene clases realizadas.</p>
      </Panel>
    )
  }

  const summary = summarizeHistory(lessons, today)
  const visible = filterLessons(lessons, filter, query)
  const countOf = (value: MaterialFilter) => filterLessons(lessons, value, '').length

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Clases realizadas">
          <p className="text-3xl font-semibold text-ocean">{summary.lessonCount}</p>
          <p className="text-xs text-ink/70">{formatDuration(summary.totalMinutes)} en total</p>
        </StatCard>
        <StatCard title="Última clase">
          {summary.lastLessonDate && summary.daysSinceLastLesson !== null && (
            <>
              <p className="text-lg font-semibold text-ocean">{formatDate(summary.lastLessonDate)}</p>
              <p className="text-xs text-ink/70">{formatDaysAgo(summary.daysSinceLastLesson)}</p>
            </>
          )}
        </StatCard>
        <StatCard title="Material resuelto">
          <p className="text-3xl font-semibold text-ocean">
            {summary.completedMaterial} de {summary.withMaterial}
          </p>
          <div
            role="progressbar"
            aria-label="Material resuelto"
            aria-valuemin={0}
            aria-valuemax={summary.withMaterial}
            aria-valuenow={summary.completedMaterial}
            className="h-2 w-full overflow-hidden rounded-full bg-mist"
          >
            <div
              className="h-full rounded-full bg-ocean"
              style={{ width: `${summary.withMaterial ? (summary.completedMaterial / summary.withMaterial) * 100 : 0}%` }}
            />
          </div>
        </StatCard>
        <StatCard title="Nota media">
          {summary.averageScore === null ? (
            <p className="text-sm text-ink/70">Sin material resuelto</p>
          ) : (
            <>
              <p className="text-3xl font-semibold text-ocean">{formatScore(summary.averageScore)}</p>
              <p className="text-xs text-ink/70">del material resuelto</p>
            </>
          )}
        </StatCard>
      </div>

      <section aria-label="Historial de clases" className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink">Historial de clases</h2>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Filtrar por estado del material" className="flex flex-wrap gap-2">
            {FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                  filter === value ? 'border-ocean bg-ocean text-white' : 'border-ink/20 text-ink/80 hover:bg-mist'
                }`}
              >
                {label}
                <span className={`text-xs font-semibold ${filter === value ? 'text-mint' : 'text-ocean'}`}>
                  {countOf(value)}
                </span>
              </button>
            ))}
          </div>
          <input
            type="search"
            aria-label="Buscar por tema"
            placeholder="Buscar por tema"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-40 flex-1 rounded-md border border-ink/20 px-3 py-1.5 text-sm"
          />
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-ink/70">Ninguna clase coincide con los filtros.</p>
        ) : (
          groupByMonth(visible, timeZone).map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-ink/70">{group.label}</h3>
              <ol className="flex flex-col">
                {group.lessons.map((lesson, index) => (
                  <LessonEntry
                    key={lesson.id}
                    lesson={lesson}
                    isLast={index === group.lessons.length - 1}
                    downloadPdf={downloadPdf}
                    openPdf={openPdf}
                  />
                ))}
              </ol>
            </div>
          ))
        )}
      </section>
    </div>
  )
}

interface LessonEntryProps {
  lesson: TeacherLessonSummary
  isLast: boolean
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  openPdf: (pdf: LessonPdf) => void
}

function LessonEntry({ lesson, isLast, downloadPdf, openPdf }: LessonEntryProps) {
  const status = MATERIAL_STATUS[lesson.materialStatus]
  const statusLabel =
    lesson.materialStatus === 'completed' && lesson.score !== null ? `Resuelto · ${formatScore(lesson.score)}` : status.label

  return (
    <li className="flex gap-4">
      <div aria-hidden="true" className="flex flex-col items-center pt-1.5">
        <span className={`h-3 w-3 shrink-0 rounded-full ${status.dot}`} />
        {!isLast && <span className="w-px flex-1 bg-ink/15" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="font-semibold text-ink">{lesson.topic}</h4>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.badge}`}>{statusLabel}</span>
        </div>
        <p className="text-sm text-ink/70">
          <time dateTime={lesson.date}>{formatDate(lesson.date)}</time> · {lesson.durationMinutes} min
        </p>
        <p className="text-sm text-ink/80">{lesson.context}</p>
        {lesson.keywords.length > 0 && (
          <ul aria-label="Palabras clave" className="flex flex-wrap gap-1.5">
            {lesson.keywords.map((keyword) => (
              <li key={keyword} className="rounded-md bg-mist px-2 py-0.5 text-xs text-ink">
                {keyword}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap items-start gap-2">
          <Link
            to={lessonDetailPath(lesson.id)}
            className="rounded-md bg-ocean px-3 py-1.5 text-sm font-medium text-white hover:bg-ink"
          >
            Ver clase
          </Link>
          {lesson.materialStatus === 'none' && (
            <Link
              to={generateMaterialPath(lesson.id)}
              className="rounded-md border border-teal px-3 py-1.5 text-sm font-medium text-ocean hover:bg-mist"
            >
              Generar material
            </Link>
          )}
          <PdfDownloadButton lessonId={lesson.id} downloadPdf={downloadPdf} openPdf={openPdf} />
        </div>
      </div>
    </li>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Historial de clases" className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-ink">Historial de clases</h2>
      {children}
    </section>
  )
}

function StatCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2 rounded-xl bg-white p-5 shadow-sm">
      <h3 className="text-xs font-medium uppercase tracking-wide text-ink/70">{title}</h3>
      {children}
    </section>
  )
}
