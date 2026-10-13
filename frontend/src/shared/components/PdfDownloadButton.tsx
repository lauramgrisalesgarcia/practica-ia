import { useState } from 'react'
import type { LessonPdf } from '@/domain/lesson'

interface PdfDownloadButtonProps {
  lessonId: string
  filename: string
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
        className="self-start rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isDownloading ? 'Descargando…' : `Descargar PDF (${filename})`}
      </button>
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
