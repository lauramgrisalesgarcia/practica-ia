import { MAX_EXERCISES, MAX_KEYWORD_LENGTH, MAX_KEYWORDS, MIN_EXERCISES } from '@/domain/businessRules'
import type { MaterialRequest } from '@/domain/lesson'

// Límites de GenerateMaterialRequest en docs/openapi.yaml

export interface MaterialFormValues {
  exerciseCount: string
  // Palabras clave separadas por comas
  keywords: string
}

export interface MaterialFormErrors {
  exerciseCount?: string
  keywords?: string
}

export type MaterialFormResult = { ok: true; request: MaterialRequest } | { ok: false; errors: MaterialFormErrors }

export function parseKeywords(text: string): string[] {
  const seen = new Set<string>()
  const keywords: string[] = []
  for (const raw of text.split(',')) {
    const keyword = raw.trim().replace(/\s+/g, ' ')
    const key = keyword.toLocaleLowerCase('es')
    if (keyword && !seen.has(key)) {
      seen.add(key)
      keywords.push(keyword)
    }
  }
  return keywords
}

function keywordsError(keywords: string[]): string | undefined {
  if (keywords.length === 0) return 'Indica al menos una palabra clave'
  if (keywords.length > MAX_KEYWORDS) return `Indica como máximo ${MAX_KEYWORDS} palabras clave`
  if (keywords.some((keyword) => keyword.length > MAX_KEYWORD_LENGTH)) {
    return `Cada palabra clave puede tener como máximo ${MAX_KEYWORD_LENGTH} caracteres`
  }
  return undefined
}

export function validateMaterialForm(values: MaterialFormValues): MaterialFormResult {
  const exerciseCount = Number(values.exerciseCount.trim() || NaN)
  const keywords = parseKeywords(values.keywords)
  const errors: MaterialFormErrors = {}

  if (!Number.isInteger(exerciseCount) || exerciseCount < MIN_EXERCISES || exerciseCount > MAX_EXERCISES) {
    errors.exerciseCount = `El número de ejercicios debe estar entre ${MIN_EXERCISES} y ${MAX_EXERCISES}`
  }
  const keywordsMessage = keywordsError(keywords)
  if (keywordsMessage) errors.keywords = keywordsMessage

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, request: { activityType: 'complete_sentence', exerciseCount, keywords } }
}
