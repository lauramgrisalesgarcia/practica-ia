import type { RecentActivity } from '@/domain/insights'

const scoreFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 0 })

// Frase de la actividad reciente, a continuación del nombre del alumno
export function activityDescription({ type, topic, score }: RecentActivity): string {
  switch (type) {
    case 'lesson':
      return `tuvo clase de «${topic}»`
    case 'material':
      return `tiene material nuevo de «${topic}»`
    case 'submission':
      return score === null ? `resolvió «${topic}»` : `resolvió «${topic}» con un ${scoreFormat.format(score)} %`
  }
}
