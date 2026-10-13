import type { ActivityType, StudentMaterial, StudentSubmission } from '../domain/lesson'

// Formas de la API del material del estudiante (docs/openapi.yaml)

// schema Submission
export interface ApiSubmission {
  lesson_id: string
  submitted_at: string
  correct_count: number
  incorrect_count: number
  score: number
  results: { exercise_id: number; selected_option: string; correct_option: string; is_correct: boolean }[]
  feedback: string
  recommendations: string[]
}

// schema StudentMaterial
export interface ApiStudentMaterial {
  lesson_id: string
  activity_type: ActivityType
  title: string
  instructions: string
  exercises: { id: number; sentence: string; options: string[] }[]
  submission: ApiSubmission | null
}

export function toStudentSubmission(submission: ApiSubmission): StudentSubmission {
  return {
    submittedAt: submission.submitted_at,
    correctCount: submission.correct_count,
    incorrectCount: submission.incorrect_count,
    score: submission.score,
    results: submission.results.map(({ exercise_id, selected_option, correct_option, is_correct }) => ({
      exerciseId: exercise_id,
      selectedOption: selected_option,
      correctOption: correct_option,
      isCorrect: is_correct,
    })),
    feedback: submission.feedback,
    recommendations: submission.recommendations,
  }
}

export function toStudentMaterial(material: ApiStudentMaterial): StudentMaterial {
  return {
    lessonId: material.lesson_id,
    activityType: material.activity_type,
    title: material.title,
    instructions: material.instructions,
    exercises: material.exercises.map(({ id, sentence, options }) => ({ id, sentence, options })),
    submission: material.submission && toStudentSubmission(material.submission),
  }
}
