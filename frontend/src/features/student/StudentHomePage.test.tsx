import { render, screen } from '@testing-library/react'
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
})
