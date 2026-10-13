import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { MY_LESSONS } from '@/test/contracts/studentServiceContract'
import type { StudentService } from './services/studentService'
import { StudentHomePage } from './StudentHomePage'

describe('StudentHomePage', () => {
  it('saluda al estudiante y muestra sus clases', async () => {
    const studentService: StudentService = {
      getMyLessons: vi.fn().mockResolvedValue(MY_LESSONS),
      downloadPdf: vi.fn(),
      getMaterial: vi.fn(),
      submitMaterial: vi.fn(),
    }
    render(
      <MemoryRouter>
        <StudentHomePage name="Ana Gómez" studentService={studentService} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Hola, Ana Gómez' })).toBeInTheDocument()
    expect(await screen.findByRole('list', { name: /mis clases/i })).toHaveTextContent('Pedir en un restaurante')
    expect(studentService.getMyLessons).toHaveBeenCalled()
  })
})
