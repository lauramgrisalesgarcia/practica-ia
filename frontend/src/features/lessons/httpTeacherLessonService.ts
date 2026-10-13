import type {
  ActivityType,
  LessonDetail,
  LessonSummary,
  MaterialStatus,
  SubmissionSummary,
  TeacherMaterial,
} from '../../domain/lesson'
import type { Level } from '../../domain/student'
import type { HttpClient } from '../../http/httpClient'
import type { TeacherLessonService } from './teacherLessonService'

// Formas de la API (docs/openapi.yaml)

// schema LessonBase
interface ApiLessonSummary {
  id: string
  date: string
  duration_minutes: number
  topic: string
  context: string
  material_status: MaterialStatus
}

// schema TeacherMaterial
interface ApiTeacherMaterial {
  generated_at: string
  activity_type: ActivityType
  exercise_count: number
  title: string
  instructions: string
  exercises: { id: number; sentence: string; options: string[]; correct_option: string }[]
}

// schema SubmissionSummary
interface ApiSubmissionSummary {
  submitted_at: string
  correct_count: number
  incorrect_count: number
  score: number
}

// schema TeacherLessonDetail
interface ApiLessonDetail extends ApiLessonSummary {
  keywords: string[]
  notes: string | null
  pdf: { filename: string; url: string }
  student: { id: string; first_name: string; last_name: string; native_language: string; level: Level }
  material: ApiTeacherMaterial | null
  submission: ApiSubmissionSummary | null
}

const DEFAULT_PDF_FILENAME = 'clase.pdf'

function toLessonSummary({ id, date, duration_minutes, topic, context, material_status }: ApiLessonSummary): LessonSummary {
  return { id, date, durationMinutes: duration_minutes, topic, context, materialStatus: material_status }
}

function toMaterial({ generated_at, activity_type, title, instructions, exercises }: ApiTeacherMaterial): TeacherMaterial {
  return {
    generatedAt: generated_at,
    activityType: activity_type,
    title,
    instructions,
    exercises: exercises.map(({ id, sentence, options, correct_option }) => ({
      id,
      sentence,
      options,
      correctOption: correct_option,
    })),
  }
}

function toSubmission({ submitted_at, correct_count, incorrect_count, score }: ApiSubmissionSummary): SubmissionSummary {
  return { submittedAt: submitted_at, correctCount: correct_count, incorrectCount: incorrect_count, score }
}

function toLessonDetail(lesson: ApiLessonDetail): LessonDetail {
  const { student } = lesson
  return {
    ...toLessonSummary(lesson),
    keywords: lesson.keywords,
    notes: lesson.notes,
    pdfFilename: lesson.pdf.filename,
    student: {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      nativeLanguage: student.native_language,
      level: student.level,
    },
    material: lesson.material && toMaterial(lesson.material),
    submission: lesson.submission && toSubmission(lesson.submission),
  }
}

function lessonPath(lessonId: string): string {
  return `/teachers/me/lessons/${encodeURIComponent(lessonId)}`
}

export function createHttpTeacherLessonService(http: HttpClient): TeacherLessonService {
  return {
    async getStudentLessons(studentId) {
      const lessons = await http.get<ApiLessonSummary[]>(`/teachers/me/students/${encodeURIComponent(studentId)}/lessons`)
      return lessons.map(toLessonSummary)
    },
    async getLesson(lessonId) {
      return toLessonDetail(await http.get<ApiLessonDetail>(lessonPath(lessonId)))
    },
    async downloadPdf(lessonId) {
      const { blob, filename } = await http.getBlob(`${lessonPath(lessonId)}/pdf`)
      return { blob, filename: filename ?? DEFAULT_PDF_FILENAME }
    },
  }
}
