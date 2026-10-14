import { render, screen } from '@testing-library/react'
import type { AuthService } from '@/features/auth/services/authService'
import type { TeacherLessonService } from '@/features/teacher/services/teacherLessonService'
import type { StudentService } from '@/features/student/services/studentService'
import type { TeacherService } from '@/features/teacher/services/teacherService'
import { ServicesProvider } from './ServicesProvider'
import { useServices } from './servicesContext'

const authService: AuthService = {
  login: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
  onSessionExpired: vi.fn(() => () => {}),
}
const teacherService: TeacherService = { getAssignedStudents: vi.fn(), getStudent: vi.fn() }
const teacherLessonService: TeacherLessonService = { getStudentLessons: vi.fn(), getLesson: vi.fn(), downloadPdf: vi.fn(), generateMaterial: vi.fn() }
const studentService: StudentService = {
  getMyLessons: vi.fn(),
  downloadPdf: vi.fn(),
  getMaterial: vi.fn(),
  submitMaterial: vi.fn(),
}

function ServicesProbe() {
  const services = useServices()
  return (
    <>
      <span>{services.authService === authService ? 'auth inyectado' : 'auth distinto'}</span>
      <span>{services.teacherService === teacherService ? 'teacher inyectado' : 'teacher distinto'}</span>
    </>
  )
}

describe('ServicesContext', () => {
  it('entrega a los componentes los servicios inyectados en el provider', () => {
    render(
      <ServicesProvider services={{ authService, teacherService, teacherLessonService, studentService, teacherInsightsService: { getInsights: vi.fn() }, studentInsightsService: { getInsights: vi.fn() } }}>
        <ServicesProbe />
      </ServicesProvider>,
    )

    expect(screen.getByText('auth inyectado')).toBeInTheDocument()
    expect(screen.getByText('teacher inyectado')).toBeInTheDocument()
  })

  it('falla con un mensaje claro si se usa fuera del provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<ServicesProbe />)).toThrow('useServices debe usarse dentro de ServicesProvider')
    consoleError.mockRestore()
  })
})
