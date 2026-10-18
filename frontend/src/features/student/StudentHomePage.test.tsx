import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { STUDENT_INSIGHTS } from '@/test/contracts/studentInsightsServiceContract'
import { StudentHomePage } from './StudentHomePage'

describe('StudentHomePage', () => {
  it('saluda al estudiante y muestra su resumen', async () => {
    const loadInsights = vi.fn().mockResolvedValue(STUDENT_INSIGHTS)
    render(
      <MemoryRouter>
        <StudentHomePage name="Ana Gómez" loadInsights={loadInsights} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Ana Gómez' })).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Refuerzos pendientes' })).toHaveTextContent('Presentarse')
    expect(loadInsights).toHaveBeenCalled()
  })

  it('ofrece ver sus clases con un botón destacado en la cabecera', () => {
    render(
      <MemoryRouter>
        <StudentHomePage name="Ana Gómez" loadInsights={vi.fn().mockReturnValue(new Promise(() => {}))} />
      </MemoryRouter>,
    )

    const header = screen.getByRole('heading', { level: 1, name: 'Hola, Ana Gómez' }).closest('header') as HTMLElement
    expect(within(header).getByRole('link', { name: 'Ver mis clases' })).toHaveAttribute('href', '/estudiante/clases')
  })
})
