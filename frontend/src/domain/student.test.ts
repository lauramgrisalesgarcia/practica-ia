import { toStudentSummary, type StudentDetail } from './student'

describe('toStudentSummary', () => {
  it('quita el detalle y conserva los datos del alumno', () => {
    const detail: StudentDetail = {
      id: '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83',
      name: 'Emma Schmidt',
      email: 'emma@correo.com',
      nativeLanguage: 'de',
      level: 'A2',
      lessonsCount: 12,
    }

    expect(toStudentSummary(detail)).toEqual({
      id: detail.id,
      name: 'Emma Schmidt',
      email: 'emma@correo.com',
      nativeLanguage: 'de',
      level: 'A2',
    })
  })
})
