import { render, screen, within } from '@testing-library/react'
import type { TeacherInsights } from '@/domain/insights'
import { InsightsPanel } from './InsightsPanel'

const INSIGHTS: TeacherInsights = {
  isSample: true,
  lessonsThisMonth: 14,
  pendingMaterials: 4,
  materialStatus: { completed: 9, pending: 4, none: 3 },
  weeklyLessons: [
    { weekStart: '2026-09-28', count: 7 },
    { weekStart: '2026-10-05', count: 4 },
  ],
  recentActivity: [
    {
      id: 'a1',
      type: 'submission',
      date: '2026-10-12T18:05:00Z',
      studentName: 'Emma Schmidt',
      description: 'resolvió «En el restaurante» con un 67 %',
    },
    { id: 'a2', type: 'material', date: '2026-10-12T10:30:00Z', studentName: 'John Miller', description: 'tiene material nuevo' },
    { id: 'a3', type: 'lesson', date: '2026-10-11T16:00:00Z', studentName: 'Emma Schmidt', description: 'tuvo clase' },
  ],
  calendar: [{ id: 'c1', start: '2026-10-13T15:00:00Z', studentName: 'John Miller', topic: 'Hablar del tiempo' }],
}

function setup(loadInsights: () => Promise<TeacherInsights> = vi.fn().mockResolvedValue(INSIGHTS)) {
  render(<InsightsPanel loadInsights={loadInsights} today={new Date('2026-10-13T09:00:00Z')} timeZone="UTC" />)
  return { loadInsights }
}

async function findRegion(name: string) {
  return screen.findByRole('region', { name })
}

describe('InsightsPanel', () => {
  it('avisa de que los datos son de ejemplo', async () => {
    setup()

    expect(await screen.findByText('Datos de ejemplo')).toBeInTheDocument()
  })

  it('no muestra el aviso con datos reales', async () => {
    setup(vi.fn().mockResolvedValue({ ...INSIGHTS, isSample: false }))

    await findRegion('Clases este mes')
    expect(screen.queryByText('Datos de ejemplo')).not.toBeInTheDocument()
  })

  it('muestra los indicadores principales', async () => {
    setup()

    expect(await findRegion('Clases este mes')).toHaveTextContent('14')
    expect(await findRegion('Materiales pendientes')).toHaveTextContent('4')
  })

  it('ya no muestra la nota media', async () => {
    setup()

    await findRegion('Clases este mes')
    expect(screen.queryByText(/nota media/i)).not.toBeInTheDocument()
  })

  it('dibuja las clases por semana con sus datos accesibles en una tabla', async () => {
    setup()

    const chart = await findRegion('Clases por semana')
    expect(within(chart).getByRole('img', { name: /clases por semana/i })).toBeInTheDocument()
    const rows = within(within(chart).getByRole('table')).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.textContent)).toEqual(['28 sept7', '5 oct4'])
  })

  it('reparte el estado del material con una leyenda que no depende del color', async () => {
    setup()

    const status = await findRegion('Estado del material')
    expect(within(status).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Resuelto9',
      'Pendiente4',
      'Sin material3',
    ])
  })

  it('muestra la actividad reciente', async () => {
    setup()

    const activity = await findRegion('Actividad reciente')
    const items = within(activity).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Emma Schmidt resolvió «En el restaurante» con un 67 %')
  })

  it('indica el tipo de cada actividad con una etiqueta, no solo con el icono', async () => {
    setup()

    const items = within(await findRegion('Actividad reciente')).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Material resuelto')
    expect(items[1]).toHaveTextContent('Material nuevo')
    expect(items[2]).toHaveTextContent('Clase')
  })

  it('muestra el calendario de clases del mes', async () => {
    setup()

    const calendar = await findRegion('Calendario de clases')
    expect(within(calendar).getByRole('heading', { name: 'octubre de 2026' })).toBeInTheDocument()
    expect(within(calendar).getByRole('button', { name: '13 de octubre, 1 clase' })).toBeInTheDocument()
  })

  it('indica que está cargando los indicadores', () => {
    setup(() => new Promise(() => {}))

    expect(screen.getByText(/cargando indicadores/i)).toBeInTheDocument()
  })

  it('muestra un error si no se pueden cargar los indicadores', async () => {
    setup(vi.fn().mockRejectedValue(new Error('No se pudieron cargar los indicadores')))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los indicadores')
  })
})
