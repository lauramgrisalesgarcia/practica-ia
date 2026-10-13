import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { StudentMaterial } from '../../domain/lesson'
import { COMPLETED_MATERIAL, PENDING_MATERIAL } from '../../test/contracts/studentServiceContract'
import { StudentMaterialPage } from './StudentMaterialPage'

function setup(loadMaterial: (lessonId: string) => Promise<StudentMaterial> = vi.fn().mockResolvedValue(PENDING_MATERIAL)) {
  render(
    <MemoryRouter>
      <StudentMaterialPage lessonId={PENDING_MATERIAL.lessonId} loadMaterial={loadMaterial} />
    </MemoryRouter>,
  )
  return { loadMaterial }
}

describe('StudentMaterialPage', () => {
  it('carga el material de la clase indicada', async () => {
    const { loadMaterial } = setup()

    await screen.findByRole('heading', { level: 1, name: 'En el restaurante' })
    expect(loadMaterial).toHaveBeenCalledWith(PENDING_MATERIAL.lessonId)
  })

  it('muestra la actividad con sus ejercicios y opciones', async () => {
    setup()

    await screen.findByRole('heading', { level: 1, name: 'En el restaurante' })
    expect(screen.getByText('Completa cada frase con la opción correcta.')).toBeInTheDocument()
    const exercises = within(screen.getByRole('list', { name: 'Ejercicios' })).getAllByRole('listitem')
    expect(exercises).toHaveLength(2)
    expect(exercises[0]).toHaveTextContent('Camarero, ¿nos trae ___, por favor?')
    expect(exercises[0]).toHaveTextContent('la carta')
    expect(exercises[0]).toHaveTextContent('la cuenta')
    expect(exercises[0]).toHaveTextContent('la mesa')
  })

  it('no muestra resultado mientras el material está pendiente', async () => {
    setup()

    await screen.findByRole('heading', { level: 1, name: 'En el restaurante' })
    expect(screen.queryByRole('region', { name: 'Tu resultado' })).not.toBeInTheDocument()
    expect(screen.queryByText(/correcto|incorrecto/i)).not.toBeInTheDocument()
  })

  it('muestra el resultado si ya resolvió el material', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    const result = await screen.findByRole('region', { name: 'Tu resultado' })
    expect(result).toHaveTextContent('50 %')
    expect(result).toHaveTextContent('1 correctas · 1 incorrectas')
  })

  it('marca cada ejercicio resuelto como correcto o incorrecto con la respuesta correcta', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    const [first, second] = within(await screen.findByRole('list', { name: 'Ejercicios' })).getAllByRole('listitem')
    expect(first).toHaveTextContent('Correcto')
    expect(first).toHaveTextContent('Tu respuesta: hace')
    expect(second).toHaveTextContent('Incorrecto')
    expect(second).toHaveTextContent('Tu respuesta: lluvia')
    expect(second).toHaveTextContent('Respuesta correcta: llover')
  })

  it('muestra el comentario y las recomendaciones', async () => {
    setup(vi.fn().mockResolvedValue(COMPLETED_MATERIAL))

    const result = await screen.findByRole('region', { name: 'Tu resultado' })
    expect(result).toHaveTextContent('Bien con «hace calor». Repasa el verbo llover.')
    expect(within(result).getByRole('list', { name: 'Recomendaciones' })).toHaveTextContent(
      'Después de «va a» va un verbo en infinitivo: «va a llover».',
    )
  })

  it('permite volver a sus clases', async () => {
    setup()

    expect(await screen.findByRole('link', { name: /volver a mis clases/i })).toHaveAttribute('href', '/estudiante')
  })

  it('indica que está cargando mientras obtiene el material', () => {
    setup(() => new Promise(() => {}))

    expect(screen.getByText(/cargando material/i)).toBeInTheDocument()
  })

  it('muestra un error si la clase no tiene material', async () => {
    setup(vi.fn().mockRejectedValue(new Error('La clase no tiene material de refuerzo')))

    expect(await screen.findByRole('alert')).toHaveTextContent('La clase no tiene material de refuerzo')
  })
})
