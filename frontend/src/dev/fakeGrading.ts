import type { Answer, StudentMaterial, StudentSubmission } from '../domain/lesson'

export const INVALID_ANSWERS_MESSAGE = 'Debes responder todos los ejercicios con una opción válida'

// Reglas del back (docs/openapi.yaml, submitMaterial): una respuesta por ejercicio,
// sin repetir y con una opción existente
export function answersAreValid({ exercises }: StudentMaterial, answers: Answer[]): boolean {
  const answeredIds = new Set(answers.map((answer) => answer.exerciseId))
  if (answers.length !== exercises.length || answeredIds.size !== answers.length) return false
  return answers.every((answer) => {
    const exercise = exercises.find((e) => e.id === answer.exerciseId)
    return exercise?.options.includes(answer.selectedOption) ?? false
  })
}

// Corrección de prueba en lugar de la del back; el comentario y las recomendaciones simulan al LLM
export function gradeFakeSubmission(answers: Answer[], answerKey: Record<number, string>): StudentSubmission {
  const results = answers.map(({ exerciseId, selectedOption }) => ({
    exerciseId,
    selectedOption,
    correctOption: answerKey[exerciseId],
    isCorrect: selectedOption === answerKey[exerciseId],
  }))
  const correctCount = results.filter((result) => result.isCorrect).length
  return {
    submittedAt: new Date().toISOString(),
    correctCount,
    incorrectCount: results.length - correctCount,
    // Porcentaje con 2 decimales, como el back
    score: Math.round((correctCount * 10000) / results.length) / 100,
    results,
    feedback: 'Buen trabajo. Repasa las frases que fallaste.',
    recommendations: ['Vuelve a leer las frases que fallaste en voz alta.'],
  }
}
