import type { Answer, StudentLessonSummary, StudentMaterial, StudentSubmission } from '@/domain/lesson'
import { answersAreValid, gradeFakeSubmission, INVALID_ANSWERS_MESSAGE } from '@/dev/fakeGrading'
import { ApiError } from '@/shared/http/errors'
import { createHttpClient } from '@/shared/http/httpClient'
import {
  DEFAULT_STUDENT_FIXTURES,
  HALF_RIGHT_ANSWERS,
  MY_LESSONS,
  describeStudentServiceContract,
  PDF_CONTENT,
  type StudentFixtures,
} from '@/test/contracts/studentServiceContract'
import { createHttpStudentService } from './httpStudentService'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// docs/openapi.yaml, schema StudentLessonSummary
function toApiLesson({ id, date, durationMinutes, topic, context, materialStatus, pdfFilename, keywords, score }: StudentLessonSummary) {
  return {
    id,
    date,
    duration_minutes: durationMinutes,
    topic,
    context,
    pdf: { filename: pdfFilename, url: `/students/me/lessons/${id}/pdf` },
    material_status: materialStatus,
    keywords,
    score,
  }
}

// docs/openapi.yaml, schema Submission
function toApiSubmission(lessonId: string, submission: StudentSubmission) {
  return {
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
  }
}

// docs/openapi.yaml, schema StudentMaterial
function toApiMaterial({ lessonId, activityType, title, instructions, exercises, submission }: StudentMaterial) {
  return {
    lesson_id: lessonId,
    activity_type: activityType,
    title,
    instructions,
    exercises,
    submission: submission && toApiSubmission(lessonId, submission),
  }
}

// docs/openapi.yaml, schema SubmissionRequest
interface ApiSubmissionRequest {
  answers: { exercise_id: number; selected_option: string }[]
}

// Back falso que responde como los endpoints de clases del estudiante según docs/openapi.yaml.
// Corrige y guarda el intento como el back real.
function createFakeBackend({ lessons, materials, answerKeys }: StudentFixtures): typeof fetch {
  let currentLessons = lessons
  const materialsById = new Map(Object.entries(materials))

  return async (input, init) => {
    const path = new URL(String(input)).pathname
    const method = init?.method

    if (path === '/students/me/lessons' && method === 'GET') return json(200, currentLessons.map(toApiLesson))

    const lessonPath = /^\/students\/me\/lessons\/([^/]+)(?:\/(pdf|material|material\/submission))?$/.exec(path)
    if (!lessonPath) return json(404, { detail: 'Not Found' })
    const lessonId = decodeURIComponent(lessonPath[1])
    const lesson = currentLessons.find((l) => l.id === lessonId)
    if (!lesson) return json(404, { detail: 'Clase no encontrada' })
    const resource = lessonPath[2]

    if (resource === undefined && method === 'GET') return json(200, toApiLesson(lesson))

    if (resource === 'pdf' && method === 'GET') {
      return new Response(PDF_CONTENT, {
        status: 200,
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${lesson.pdfFilename}"` },
      })
    }

    const material = materialsById.get(lessonId)
    if (!material) return json(404, { detail: 'La clase no tiene material de refuerzo' })
    if (resource === 'material' && method === 'GET') return json(200, toApiMaterial(material))

    if (resource === 'material/submission' && method === 'POST') {
      if (material.submission) return json(409, { detail: 'El material ya fue resuelto' })
      const body = JSON.parse(String(init?.body)) as ApiSubmissionRequest
      const answers: Answer[] = body.answers.map(({ exercise_id, selected_option }) => ({
        exerciseId: exercise_id,
        selectedOption: selected_option,
      }))
      if (!answersAreValid(material, answers)) return json(422, { detail: INVALID_ANSWERS_MESSAGE })
      const submission = gradeFakeSubmission(answers, answerKeys[lessonId])
      materialsById.set(lessonId, { ...material, submission })
      currentLessons = currentLessons.map((l) =>
        l.id === lessonId ? { ...l, materialStatus: 'completed', score: submission.score } : l,
      )
      return json(201, toApiSubmission(lessonId, submission))
    }

    return json(405, { detail: 'Method Not Allowed' })
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

  it('envía las respuestas a POST /students/me/lessons/{id}/material/submission', async () => {
    const fetchFn = vi.fn(createFakeBackend(DEFAULT_STUDENT_FIXTURES))

    await createService(fetchFn).submitMaterial(MY_LESSONS[0].id, HALF_RIGHT_ANSWERS)

    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe(`http://api.test/students/me/lessons/${MY_LESSONS[0].id}/material/submission`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      answers: [
        { exercise_id: 1, selected_option: 'la carta' },
        { exercise_id: 2, selected_option: 'Quiero que' },
      ],
    })
  })

  it('propaga el error si fallan las recomendaciones del LLM (502)', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json(502, { detail: 'No se pudieron generar las recomendaciones' }))

    await expect(createService(fetchFn).submitMaterial(MY_LESSONS[0].id, HALF_RIGHT_ANSWERS)).rejects.toEqual(
      new ApiError(502, 'No se pudieron generar las recomendaciones'),
    )
  })

  it('usa un nombre genérico si el back no indica el del PDF', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(PDF_CONTENT, { status: 200 }))

    await expect(createService(fetchFn).downloadPdf('abc')).resolves.toMatchObject({ filename: 'clase.pdf' })
  })
})
