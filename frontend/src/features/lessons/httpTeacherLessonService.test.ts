import type { LessonDetail, LessonSummary } from '../../domain/lesson'
import { createHttpClient } from '../../http/httpClient'
import {
  DEFAULT_FIXTURES,
  describeTeacherLessonServiceContract,
  PDF_CONTENT,
  RESTAURANT_LESSON,
  type TeacherLessonFixtures,
} from '../../test/contracts/teacherLessonServiceContract'
import { createHttpTeacherLessonService } from './httpTeacherLessonService'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function splitName(name: string) {
  const [firstName, ...lastNames] = name.split(' ')
  return { first_name: firstName, last_name: lastNames.join(' ') }
}

function toApiSummary({ id, date, durationMinutes, topic, context, materialStatus }: LessonSummary) {
  return { id, date, duration_minutes: durationMinutes, topic, context, material_status: materialStatus }
}

// docs/openapi.yaml, schema TeacherLessonDetail
function toApiDetail(lesson: LessonDetail) {
  const { student, material, submission } = lesson
  return {
    ...toApiSummary(lesson),
    keywords: lesson.keywords,
    notes: lesson.notes,
    pdf: { filename: lesson.pdfFilename, url: `/teachers/me/lessons/${lesson.id}/pdf` },
    student: { id: student.id, ...splitName(student.name), native_language: student.nativeLanguage, level: student.level },
    material: material && {
      generated_at: material.generatedAt,
      activity_type: material.activityType,
      exercise_count: material.exercises.length,
      title: material.title,
      instructions: material.instructions,
      exercises: material.exercises.map(({ id, sentence, options, correctOption }) => ({
        id,
        sentence,
        options,
        correct_option: correctOption,
      })),
    },
    submission: submission && {
      submitted_at: submission.submittedAt,
      correct_count: submission.correctCount,
      incorrect_count: submission.incorrectCount,
      score: submission.score,
    },
  }
}

// Back falso que responde como los endpoints de clases del docente según docs/openapi.yaml
function createFakeBackend({ lessonsByStudent, lessons }: TeacherLessonFixtures): typeof fetch {
  return async (input, init) => {
    const path = new URL(String(input)).pathname
    if (init?.method !== 'GET') return json(405, { detail: 'Method Not Allowed' })

    const history = /^\/teachers\/me\/students\/([^/]+)\/lessons$/.exec(path)
    if (history) {
      const studentId = decodeURIComponent(history[1])
      if (!Object.hasOwn(lessonsByStudent, studentId)) return json(404, { detail: 'Estudiante no encontrado' })
      return json(200, lessonsByStudent[studentId].map(toApiSummary))
    }

    const lessonPath = /^\/teachers\/me\/lessons\/([^/]+)(\/pdf)?$/.exec(path)
    if (lessonPath) {
      const lesson = lessons.find((l) => l.id === decodeURIComponent(lessonPath[1]))
      if (!lesson) return json(404, { detail: 'Clase no encontrada' })
      if (!lessonPath[2]) return json(200, toApiDetail(lesson))
      return new Response(PDF_CONTENT, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${lesson.pdfFilename}"` },
      })
    }

    return json(404, { detail: 'Not Found' })
  }
}

function createService(fetchFn: typeof fetch) {
  return createHttpTeacherLessonService(createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'token', fetchFn }))
}

describe('httpTeacherLessonService', () => {
  describeTeacherLessonServiceContract((fixtures) => createService(createFakeBackend(fixtures)))

  it.each([
    ['el historial', (s: ReturnType<typeof createService>) => s.getStudentLessons('a/b'), '/teachers/me/students/a%2Fb/lessons'],
    ['el detalle', (s: ReturnType<typeof createService>) => s.getLesson('a/b'), '/teachers/me/lessons/a%2Fb'],
    ['el PDF', (s: ReturnType<typeof createService>) => s.downloadPdf('a/b'), '/teachers/me/lessons/a%2Fb/pdf'],
  ])('pide %s escapando el identificador', async (_, call, path) => {
    const fetchFn = vi.fn(createFakeBackend(DEFAULT_FIXTURES))

    await call(createService(fetchFn)).catch(() => {})

    expect(fetchFn).toHaveBeenCalledWith(`http://api.test${path}`, expect.objectContaining({ method: 'GET' }))
  })

  it('usa un nombre genérico si el back no indica el del PDF', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(PDF_CONTENT, { status: 200 }))

    await expect(createService(fetchFn).downloadPdf(RESTAURANT_LESSON.id)).resolves.toMatchObject({ filename: 'clase.pdf' })
  })
})
