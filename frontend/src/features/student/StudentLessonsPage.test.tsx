import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { MY_LESSONS } from '@/test/contracts/studentServiceContract'
import { StudentLessonsPage } from './StudentLessonsPage'

describe('StudentLessonsPage', () => {
  it('muestra el historial de clases del estudiante con un enlace de vuelta al panel', async () => {
    const loadLessons = vi.fn().mockResolvedValue(MY_LESSONS)
    render(
      <MemoryRouter>
        <StudentLessonsPage loadLessons={loadLessons} downloadPdf={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Historial de clases' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Volver a mi panel' })).toHaveAttribute('href', '/estudiante')
    expect(await screen.findByRole('list', { name: /mis clases/i })).toHaveTextContent('Pedir en un restaurante')
    expect(loadLessons).toHaveBeenCalled()
  })
})
