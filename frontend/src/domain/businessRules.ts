// Reglas de negocio de PractIcA: los mismos límites que valida el back (docs/openapi.yaml)

// Material de refuerzo
export const MIN_EXERCISES = 1
export const MAX_EXERCISES = 15
export const DEFAULT_EXERCISE_COUNT = 5
export const MAX_KEYWORDS = 20
export const MAX_KEYWORD_LENGTH = 50

// Nota: porcentaje de aciertos de 0 a 100 con 2 decimales
export const MAX_SCORE = 100
export const SCORE_DECIMALS = 2

// Paneles: actividad reciente y evolución de la nota
export const RECENT_ACTIVITY_LIMIT = 10
export const SCORE_HISTORY_LIMIT = 10

const SCORE_ROUNDING = 10 ** SCORE_DECIMALS

function roundScore(score: number): number {
  return Math.round(score * SCORE_ROUNDING) / SCORE_ROUNDING
}

// Nota de una entrega: porcentaje de aciertos
export function scorePercentage(correctCount: number, total: number): number {
  return roundScore((correctCount / total) * MAX_SCORE)
}

// Nota media de varias entregas (null si no hay ninguna)
export function averageScore(scores: number[]): number | null {
  if (scores.length === 0) return null
  return roundScore(scores.reduce((sum, score) => sum + score, 0) / scores.length)
}
