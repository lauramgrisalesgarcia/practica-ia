import type { Level, Student } from '@/domain/student'
import { languageName } from '@/shared/i18n/languageName'

const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function countByLevel(students: Student[]): { level: Level; count: number }[] {
  return LEVELS.map((level) => ({ level, count: students.filter((s) => s.level === level).length })).filter(
    ({ count }) => count > 0,
  )
}

export function countByLanguage(students: Student[]): { language: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const { nativeLanguage } of students) {
    const language = languageName(nativeLanguage)
    counts.set(language, (counts.get(language) ?? 0) + 1)
  }
  return Array.from(counts, ([language, count]) => ({ language, count })).sort(
    (a, b) => b.count - a.count || a.language.localeCompare(b.language, 'es'),
  )
}

// Palabras del nombre que forman las iniciales: nombre y primer apellido
const INITIALS_WORDS = 2

// Iniciales del nombre y el primer apellido (p. ej. «Ana Gómez» → «AG»)
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, INITIALS_WORDS)
    .map((word) => word[0].toLocaleUpperCase('es'))
    .join('')
}
