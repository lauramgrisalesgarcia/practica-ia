import { useState } from 'react'
import type { LessonPdf } from '@/domain/lesson'
import { errorMessage } from '@/shared/errors/errorMessage'

interface PdfDownloadButtonProps {
  lessonId: string
  // Si se indica, forma parte del nombre accesible y del tooltip del botón
  filename?: string
  downloadPdf: (lessonId: string) => Promise<LessonPdf>
  openPdf: (pdf: LessonPdf) => void
}

// Descarga el PDF de una clase y lo entrega a openPdf; muestra su propio estado y error
export function PdfDownloadButton({ lessonId, filename, downloadPdf, openPdf }: PdfDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setError(null)
    setIsDownloading(true)
    try {
      openPdf(await downloadPdf(lessonId))
    } catch (downloadError) {
      setError(errorMessage(downloadError, 'No se pudo descargar el PDF'))
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={filename ? `Descargar PDF (${filename})` : undefined}
        title={filename}
        className="flex items-center gap-1.5 self-start rounded-md border border-ink/20 px-3 py-1.5 text-sm font-medium text-ocean hover:bg-mist disabled:opacity-50"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
        </svg>
        {isDownloading ? 'Descargando…' : 'PDF'}
      </button>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
