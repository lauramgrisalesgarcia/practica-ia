import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { StudentInsights } from '@/domain/studentInsights'
import { STUDENT_INSIGHTS } from '@/test/contracts/studentInsightsServiceContract'
import { StudentInsightsPanel } from './StudentInsightsPanel'

const EMPTY: StudentInsights = {
  lessonsCount: 0,
  completedMaterials: 0,
  averageScore: null,
  pendingMaterials: [],
  recentActivity: [],
  calendar: [],
  scoreHistory: [],
}

function setup(loadInsights: () => Promise<StudentInsights> = vi.fn().mockResolvedValue(STUDENT_INSIGHTS)) {
  render(
    <MemoryRouter>
      <StudentInsightsPanel loadInsights={loadInsights} today={new Date('2026-10-13T09:00:00Z')} timeZone="UTC" />
    </MemoryRouter>,
  )
  return { loadInsights }
}

async function findRegion(name: string) {
  return screen.findByRole('region', { name })
}

describe('StudentInsightsPanel', () => {
  it('muestra el resumen: clases, refuerzos resueltos y nota media', async () => {
    setup()

    expect(await findRegion('Clases realizadas')).toHaveTextContent('2')
    expect(await findRegion('Refuerzos resueltos')).toHaveTextContent('1')
    expect(await findRegion('Nota media')).toHaveTextContent('67 %')
  })

  it('lista los refuerzos pendientes con un acceso para resolverlos', async () => {
    setup()

    const pending = await findRegion('Refuerzos pendientes')
    const [item] = within(pending).getAllByRole('listitem')
    expect(item).toHaveTextContent('Presentarse')
    expect(item).toHaveTextContent('1 de octubre de 2026')
    expect(item).toHaveTextContent('5 preguntas')
    expect(within(item).getByRole('link', { name: 'Resolver el refuerzo de «Presentarse»' })).toHaveAttribute(
      'href',
      '/estudiante/clases/1e7d3b5a-8c2f-4a6e-9d0b-3f5a7c9e1b28',
    )
  })

  it('muestra la actividad reciente con una etiqueta de tipo', async () => {
    setup()

    const items = within(await findRegion('Actividad reciente')).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Refuerzo resuelto')
    expect(items[0]).toHaveTextContent('Resolviste «Pedir en un restaurante» con un 67 %')
    expect(items[1]).toHaveTextContent('Clase')
  })

  it('muestra el calendario de clases con el tema de cada una', async () => {
    setup()

    const calendar = await findRegion('Calendario de clases')
    expect(within(calendar).getByRole('heading', { name: 'octubre de 2026' })).toBeInTheDocument()
    expect(within(calendar).getByRole('button', { name: '8 de octubre, 1 clase' })).toBeInTheDocument()
  })

  it('dibuja la evolución de la nota con sus datos accesibles en una tabla', async () => {
    setup()

    const chart = await findRegion('Evolución de tu nota')
    expect(within(chart).getByRole('img', { name: /evolución de tu nota/i })).toBeInTheDocument()
    const table = within(chart).getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Fecha', 'Nota'])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.textContent)).toEqual(['12 oct67 %'])
  })

  it('enlaza con el historial de clases', async () => {
    setup()

    expect(await screen.findByRole('link', { name: 'Ver historial de clases' })).toHaveAttribute('href', '/estudiante/clases')
  })

  it('explica cada sección vacía si el estudiante aún no tiene actividad', async () => {
    setup(vi.fn().mockResolvedValue(EMPTY))

    expect(await findRegion('Nota media')).toHaveTextContent('Sin refuerzos resueltos')
    expect(await findRegion('Refuerzos pendientes')).toHaveTextContent('No tienes refuerzos pendientes.')
    expect(await findRegion('Actividad reciente')).toHaveTextContent('Aún no hay actividad.')
    expect(await findRegion('Evolución de tu nota')).toHaveTextContent('Aún no has resuelto ningún refuerzo.')
  })

  it('indica que está cargando', () => {
    setup(() => new Promise(() => {}))

    expect(screen.getByText(/cargando tu resumen/i)).toBeInTheDocument()
  })

  it('muestra un error si no se pueden cargar los indicadores', async () => {
    setup(vi.fn().mockRejectedValue(new Error('No se pudo cargar tu resumen')))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar tu resumen')
  })
})
