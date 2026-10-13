import type { LessonDetail, LessonSummary, MaterialRequest, TeacherMaterial } from '../../domain/lesson'
import { buildFakeMaterial, materialGenerationError } from '../../dev/fakeMaterial'
import { ApiError } from '../../http/errors'
import { createHttpClient } from '../../http/httpClient'
import {
  DEFAULT_FIXTURES,
  INTRODUCTIONS_LESSON,
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

// docs/openapi.yaml, schema TeacherMaterial
function toApiMaterial(material: TeacherMaterial) {
  return {
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
  }
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
    material: material && toApiMaterial(material),
    submission: submission && {
      submitted_at: submission.submittedAt,
      correct_count: submission.correctCount,
      incorrect_count: submission.incorrectCount,
      score: submission.score,
    },
  }
}

// docs/openapi.yaml, schema GenerateMaterialRequest
interface ApiMaterialRequest {
  activity_type: MaterialRequest['activityType']
  exercise_count: number
  keywords?: string[]
}

// Back falso que responde como los endpoints de clases del docente según docs/openapi.yaml.
// Guarda el material generado (con un LLM simulado) como el back real.
function createFakeBackend({ lessonsByStudent, lessons }: TeacherLessonFixtures): typeof fetch {
  const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]))

  return async (input, init) => {
    const path = new URL(String(input)).pathname
    const method = init?.method

    const history = /^\/teachers\/me\/students\/([^/]+)\/lessons$/.exec(path)
    if (history && method === 'GET') {
      const studentId = decodeURIComponent(history[1])
      if (!Object.hasOwn(lessonsByStudent, studentId)) return json(404, { detail: 'Estudiante no encontrado' })
      return json(
        200,
        lessonsByStudent[studentId].map((summary) => toApiSummary(lessonsById.get(summary.id) ?? summary)),
      )
    }

    const lessonPath = /^\/teachers\/me\/lessons\/([^/]+)(\/pdf|\/material)?$/.exec(path)
    if (lessonPath) {
      const lessonId = decodeURIComponent(lessonPath[1])
      const lesson = lessonsById.get(lessonId)
      if (!lesson) return json(404, { detail: 'Clase no encontrada' })
      const resource = lessonPath[2]

      if (!resource && method === 'GET') return json(200, toApiDetail(lesson))
      if (resource === '/pdf' && method === 'GET') {
        return new Response(PDF_CONTENT, {
          status: 200,
          headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${lesson.pdfFilename}"` },
        })
      }
      if (resource === '/material' && method === 'POST') {
        const error = materialGenerationError(lesson)
        if (error) return json(409, { detail: error })
        const body = JSON.parse(String(init?.body)) as ApiMaterialRequest
        const material = buildFakeMaterial(lesson, {
          activityType: body.activity_type,
          exerciseCount: body.exercise_count,
          keywords: body.keywords,
        })
        lessonsById.set(lessonId, { ...lesson, material, materialStatus: 'pending' })
        return json(201, { lesson_id: lessonId, ...toApiMaterial(material) })
      }
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

  it('envía la petición de material a POST /teachers/me/lessons/{id}/material', async () => {
    const fetchFn = vi.fn(createFakeBackend(DEFAULT_FIXTURES))

    await createService(fetchFn).generateMaterial(INTRODUCTIONS_LESSON.id, {
      activityType: 'complete_sentence',
      exerciseCount: 3,
      keywords: ['mi hermano'],
    })

    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe(`http://api.test/teachers/me/lessons/${INTRODUCTIONS_LESSON.id}/material`)
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      activity_type: 'complete_sentence',
      exercise_count: 3,
      keywords: ['mi hermano'],
    })
  })

  it('no envía palabras clave si el docente no las indica', async () => {
    const fetchFn = vi.fn(createFakeBackend(DEFAULT_FIXTURES))

    await createService(fetchFn).generateMaterial(INTRODUCTIONS_LESSON.id, { activityType: 'complete_sentence', exerciseCount: 3 })

    expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).not.toHaveProperty('keywords')
  })

  it('propaga el error si la respuesta del LLM no es válida (502)', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(json(502, { detail: 'No se pudo generar el material de refuerzo' }))

    await expect(
      createService(fetchFn).generateMaterial(INTRODUCTIONS_LESSON.id, { activityType: 'complete_sentence', exerciseCount: 3 }),
    ).rejects.toEqual(new ApiError(502, 'No se pudo generar el material de refuerzo'))
  })

  it('usa un nombre genérico si el back no indica el del PDF', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(PDF_CONTENT, { status: 200 }))

    await expect(createService(fetchFn).downloadPdf(RESTAURANT_LESSON.id)).resolves.toMatchObject({ filename: 'clase.pdf' })
  })
})
