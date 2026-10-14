import type { StudentActivity } from '@/domain/studentInsights'
import { formatScore } from './formatScore'

// Frase de la actividad reciente del estudiante
export function studentActivityDescription({ type, topic, score }: StudentActivity): string {
  switch (type) {
    case 'lesson':
      return `Tuviste clase de «${topic}»`
    case 'material':
      return `Tienes un refuerzo nuevo de «${topic}»`
    case 'submission':
      return score === null ? `Resolviste «${topic}»` : `Resolviste «${topic}» con un ${formatScore(score)}`
  }
}
