import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MaterialRequest, TeacherMaterial } from '@/domain/lesson'
import { INTRODUCTIONS_LESSON, RESTAURANT_LESSON } from '@/test/contracts/teacherLessonServiceContract'
import { GenerateMaterialForm } from './GenerateMaterialForm'

const MATERIAL = RESTAURANT_LESSON.material as TeacherMaterial

interface SetupOptions {
  generateMaterial?: (lessonId: string, request: MaterialRequest) => Promise<TeacherMaterial>
}

function setup({ generateMaterial = vi.fn().mockResolvedValue(MATERIAL) }: SetupOptions = {}) {
  const onGenerated = vi.fn()
  const onCancel = vi.fn()
  render(
    <GenerateMaterialForm
      lessonId={INTRODUCTIONS_LESSON.id}
      initialKeywords={INTRODUCTIONS_LESSON.keywords}
      generateMaterial={generateMaterial}
      onGenerated={onGenerated}
      onCancel={onCancel}
    />,
  )
  return {
    user: userEvent.setup(),
    generateMaterial,
    onGenerated,
    onCancel,
    exerciseCount: screen.getByLabelText(/número de ejercicios/i),
    keywords: screen.getByLabelText(/palabras clave/i),
  }
}

describe('GenerateMaterialForm', () => {
  it('propone 5 ejercicios y las palabras clave de la clase', () => {
    const { exerciseCount, keywords } = setup()

    expect(exerciseCount).toHaveValue(5)
    expect(keywords).toHaveValue('me llamo, mi familia')
  })

  it('genera el material con los valores revisados por el docente', async () => {
    const { user, generateMaterial, onGenerated, exerciseCount, keywords } = setup()

    await user.clear(exerciseCount)
    await user.type(exerciseCount, '3')
    await user.type(keywords, ', mi hermano')
    await user.click(screen.getByRole('button', { name: 'Generar material' }))

    expect(generateMaterial).toHaveBeenCalledWith(INTRODUCTIONS_LESSON.id, {
      activityType: 'complete_sentence',
      exerciseCount: 3,
      keywords: ['me llamo', 'mi familia', 'mi hermano'],
    })
    expect(onGenerated).toHaveBeenCalledWith(MATERIAL)
  })

  it('no genera nada si el formulario no es válido', async () => {
    const { user, generateMaterial, exerciseCount, keywords } = setup()

    await user.clear(exerciseCount)
    await user.type(exerciseCount, '20')
    await user.clear(keywords)
    await user.click(screen.getByRole('button', { name: 'Generar material' }))

    expect(screen.getByText('El número de ejercicios debe estar entre 1 y 15')).toBeInTheDocument()
    expect(screen.getByText('Indica al menos una palabra clave')).toBeInTheDocument()
    expect(exerciseCount).toHaveAttribute('aria-invalid', 'true')
    expect(keywords).toHaveAttribute('aria-invalid', 'true')
    expect(generateMaterial).not.toHaveBeenCalled()
  })

  it('indica que está generando y desactiva el botón', async () => {
    let resolve!: (material: TeacherMaterial) => void
    const { user } = setup({ generateMaterial: () => new Promise((r) => (resolve = r)) })
    const button = screen.getByRole('button', { name: 'Generar material' })

    await user.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(/generando/i)
    resolve(MATERIAL)
    expect(await screen.findByRole('button', { name: 'Generar material' })).toBeEnabled()
  })

  it.each([
    ['la clase aún no se ha realizado (409)', 'Solo se puede generar material para clases ya realizadas'],
    ['la respuesta del LLM no es válida (502)', 'No se pudo generar el material de refuerzo'],
  ])('muestra el error si %s', async (_, message) => {
    const { user, onGenerated } = setup({ generateMaterial: vi.fn().mockRejectedValue(new Error(message)) })

    await user.click(screen.getByRole('button', { name: 'Generar material' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(onGenerated).not.toHaveBeenCalled()
  })

  it('borra el error anterior al volver a intentarlo', async () => {
    const generateMaterial = vi
      .fn()
      .mockRejectedValueOnce(new Error('No se pudo generar el material de refuerzo'))
      .mockResolvedValueOnce(MATERIAL)
    const { user } = setup({ generateMaterial })
    const button = screen.getByRole('button', { name: 'Generar material' })

    await user.click(button)
    await screen.findByRole('alert')
    await user.click(button)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('permite cancelar sin generar nada', async () => {
    const { user, generateMaterial, onCancel } = setup()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalled()
    expect(generateMaterial).not.toHaveBeenCalled()
  })
})
