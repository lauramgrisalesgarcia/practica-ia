import type { StudentMaterial } from '../../domain/lesson'
import { createHttpClient } from '../../http/httpClient'
import {
  DEFAULT_STUDENT_FIXTURES,
  describeStudentServiceContract,
  PDF_CONTENT,
  type StudentFixtures,
} from '../../test/contracts/studentServiceContract'
import { createHttpStudentService } from './httpStudentService'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// docs/openapi.yaml, schema StudentMaterial
function toApiMaterial({ lessonId, activityType, title, instructions, exercises, submission }: StudentMaterial) {
  return {
    lesson_id: lessonId,
    activity_type: activityType,
    title,
    instructions,
    exercises,
    submission: submission && {
      lesson_id: lessonId,
      submitted_at: submission.submittedAt,
      correct_count: submission.correctCount,
      incorrect_count: submission.incorrectCount,
      score: submission.score,
      results: submission.results.map(({ exerciseId, selectedOption, correctOption, isCorrect }) => ({
        exercise_id: exerciseId,
        selected_option: selectedOption,
        correct_option: correctOption,
        is_correct: isCorrect,
      })),
      feedback: submission.feedback,
      recommendations: submission.recommendations,
    },
  }
}

// Back falso que responde como los endpoints de clases del estudiante según docs/openapi.yaml
function createFakeBackend({ lessons, materials }: StudentFixtures): typeof fetch {
  return async (input, init) => {
    const path = new URL(String(input)).pathname
    if (init?.method !== 'GET') return json(405, { detail: 'Method Not Allowed' })

    if (path === '/students/me/lessons') {
      return json(
        200,
        lessons.map(({ id, date, durationMinutes, topic, context, materialStatus, pdfFilename }) => ({
          id,
          date,
          duration_minutes: durationMinutes,
          topic,
          context,
          pdf: { filename: pdfFilename, url: `/students/me/lessons/${id}/pdf` },
          material_status: materialStatus,
        })),
      )
    }

    const lessonPath = /^\/students\/me\/lessons\/([^/]+)\/(pdf|material)$/.exec(path)
    if (lessonPath) {
      const lessonId = decodeURIComponent(lessonPath[1])
      const lesson = lessons.find((l) => l.id === lessonId)
      if (!lesson) return json(404, { detail: 'Clase no encontrada' })
      if (lessonPath[2] === 'material') {
        if (!Object.hasOwn(materials, lessonId)) return json(404, { detail: 'La clase no tiene material de refuerzo' })
        return json(200, toApiMaterial(materials[lessonId]))
      }
      return new Response(PDF_CONTENT, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${lesson.pdfFilename}"` },
      })
    }

    return json(404, { detail: 'Not Found' })
  }
}

function createService(fetchFn: typeof fetch) {
  return createHttpStudentService(createHttpClient({ baseUrl: 'http://api.test', getToken: () => 'token', fetchFn }))
}

describe('httpStudentService', () => {
  describeStudentServiceContract((fixtures) => createService(createFakeBackend(fixtures)))

  it('pide el PDF escapando el identificador', async () => {
    const fetchFn = vi.fn(createFakeBackend(DEFAULT_STUDENT_FIXTURES))

    await createService(fetchFn).downloadPdf('a/b').catch(() => {})

    expect(fetchFn).toHaveBeenCalledWith('http://api.test/students/me/lessons/a%2Fb/pdf', expect.objectContaining({ method: 'GET' }))
  })

  it('pide el material escapando el identificador', async () => {
    const fetchFn = vi.fn(createFakeBackend(DEFAULT_STUDENT_FIXTURES))

    await createService(fetchFn).getMaterial('a/b').catch(() => {})

    expect(fetchFn).toHaveBeenCalledWith(
      'http://api.test/students/me/lessons/a%2Fb/material',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('usa un nombre genérico si el back no indica el del PDF', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(PDF_CONTENT, { status: 200 }))

    await expect(createService(fetchFn).downloadPdf('abc')).resolves.toMatchObject({ filename: 'clase.pdf' })
  })
})
