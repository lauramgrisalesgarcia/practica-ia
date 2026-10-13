import type { LessonPdf } from '@/domain/lesson'

// Guarda en el equipo del usuario un archivo descargado de la API
export function saveFile({ blob, filename }: LessonPdf): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(url)
  }
}
