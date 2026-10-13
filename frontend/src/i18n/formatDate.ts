const dateFormat = new Intl.DateTimeFormat('es', { dateStyle: 'long' })

// Fecha ISO 8601 en español (p. ej. "8 de octubre de 2026")
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(isoDate))
}
