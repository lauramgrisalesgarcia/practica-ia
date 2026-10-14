const scoreFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 0 })

// Porcentaje de aciertos redondeado: «67 %»
export function formatScore(score: number): string {
  return `${scoreFormat.format(score)} %`
}
