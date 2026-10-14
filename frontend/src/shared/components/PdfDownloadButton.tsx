import { useState } from 'react'
import type { LessonPdf } from '@/domain/lesson'

interface PdfDownloadButtonProps {
  lessonId: string
  // Sin nombre, el botón es compacto («PDF»)
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
      setError(downloadError instanceof Error ? downloadError.message : 'No se pudo descargar el PDF')
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
        className={
          filename
            ? 'self-start rounded-md bg-ocean px-4 py-2 font-medium text-white hover:bg-ink disabled:opacity-50'
            : 'self-start rounded-md border border-ink/20 px-3 py-1.5 text-sm font-medium text-ocean hover:bg-mist disabled:opacity-50'
        }
      >
        {isDownloading ? 'Descargando…' : filename ? `Descargar PDF (${filename})` : 'PDF'}
      </button>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
