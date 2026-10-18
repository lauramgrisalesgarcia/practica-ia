import { useId, useState, type FormEvent } from 'react'
import { MAX_EXERCISES, MIN_EXERCISES, type MaterialRequest, type TeacherMaterial } from '@/domain/lesson'
import { GENERATE_MATERIAL_ANCHOR } from '@/shared/routes/paths'
import { validateMaterialForm, type MaterialFormErrors } from './materialForm'
import { errorMessage } from '@/shared/errors/errorMessage'

interface GenerateMaterialFormProps {
  lessonId: string
  initialKeywords: string[]
  generateMaterial: (lessonId: string, request: MaterialRequest) => Promise<TeacherMaterial>
  onGenerated: (material: TeacherMaterial) => void
  // Si se indica, el formulario ofrece «Cancelar»
  onCancel?: () => void
}

const DEFAULT_EXERCISE_COUNT = '5'

export function GenerateMaterialForm({
  lessonId,
  initialKeywords,
  generateMaterial,
  onGenerated,
  onCancel,
}: GenerateMaterialFormProps) {
  const id = useId()
  const [exerciseCount, setExerciseCount] = useState(DEFAULT_EXERCISE_COUNT)
  const [keywords, setKeywords] = useState(initialKeywords.join(', '))
  const [errors, setErrors] = useState<MaterialFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)

    const result = validateMaterialForm({ exerciseCount, keywords })
    setErrors(result.ok ? {} : result.errors)
    if (!result.ok) return

    setIsGenerating(true)
    try {
      onGenerated(await generateMaterial(lessonId, result.request))
    } catch (error) {
      setSubmitError(errorMessage(error, 'No se pudo generar el material de refuerzo'))
    } finally {
      setIsGenerating(false)
    }
  }

  const exerciseCountId = `${id}-exercise-count`
  const keywordsId = `${id}-keywords`

  return (
    <form
      id={GENERATE_MATERIAL_ANCHOR}
      noValidate
      onSubmit={handleSubmit}
      aria-label="Generar material"
      className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-md"
    >
      <h2 className="text-lg font-semibold text-ink">Configurar el material</h2>
      <p className="text-sm text-ink/70">El material se genera una única vez: después no se podrá volver a generar.</p>

      <div className="flex flex-col gap-1">
        <label htmlFor={exerciseCountId} className="text-sm font-medium">
          Número de ejercicios
        </label>
        <input
          id={exerciseCountId}
          type="number"
          min={MIN_EXERCISES}
          max={MAX_EXERCISES}
          value={exerciseCount}
          onChange={(e) => setExerciseCount(e.target.value)}
          aria-invalid={Boolean(errors.exerciseCount)}
          aria-describedby={errors.exerciseCount ? `${exerciseCountId}-error` : undefined}
          className="w-28 rounded-md border border-ink/20 px-3 py-2"
        />
        {errors.exerciseCount && (
          <p id={`${exerciseCountId}-error`} className="text-sm text-red-600">
            {errors.exerciseCount}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={keywordsId} className="text-sm font-medium">
          Palabras clave
        </label>
        <textarea
          id={keywordsId}
          rows={2}
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          aria-invalid={Boolean(errors.keywords)}
          aria-describedby={`${keywordsId}-hint${errors.keywords ? ` ${keywordsId}-error` : ''}`}
          className="rounded-md border border-ink/20 px-3 py-2"
        />
        <p id={`${keywordsId}-hint`} className="text-xs text-ink/70">
          Separadas por comas. Los cambios solo se usan para generar este material; no modifican la clase.
        </p>
        {errors.keywords && (
          <p id={`${keywordsId}-error`} className="text-sm text-red-600">
            {errors.keywords}
          </p>
        )}
      </div>

      {submitError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isGenerating}
          className="rounded-md bg-ocean px-4 py-2 font-medium text-white hover:bg-ink disabled:opacity-50"
        >
          {isGenerating ? 'Generando…' : 'Generar material'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isGenerating}
            className="rounded-md border border-ink/20 px-4 py-2 font-medium text-ocean hover:bg-mist disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
