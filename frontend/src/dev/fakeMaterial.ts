import type { LessonDetail, MaterialRequest, TeacherMaterial } from '@/domain/lesson'

const DISTRACTORS = ['opción B', 'opción C']

// Material de prueba determinista en lugar del que generaría el LLM
export function buildFakeMaterial(lesson: LessonDetail, { activityType, exerciseCount, keywords }: MaterialRequest): TeacherMaterial {
  const words = keywords ?? lesson.keywords
  return {
    generatedAt: new Date().toISOString(),
    activityType,
    title: `Refuerzo: ${lesson.topic}`,
    instructions: 'Completa cada frase con la opción correcta.',
    exercises: Array.from({ length: exerciseCount }, (_, index) => {
      const word = words[index % words.length]
      return { id: index + 1, sentence: `Frase ${index + 1}: ___.`, options: [word, ...DISTRACTORS], correctOption: word }
    }),
  }
}

// Reglas del back para generar material (docs/openapi.yaml, generateMaterial)
export function materialGenerationError(lesson: LessonDetail, now = new Date()): string | null {
  if (new Date(lesson.date) > now) return 'Solo se puede generar material para clases ya realizadas'
  if (lesson.submission) return 'El material ya fue resuelto por el estudiante y no se puede regenerar'
  return null
}
