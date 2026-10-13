import type { Student } from '../../domain/student'
import type { TeacherService } from '../../features/teacher/teacherService'

export const TEST_STUDENTS: Student[] = [
  {
    id: 'b71e4a90-2c5d-4f3e-8a1b-6d7c8e9f0a12',
    name: 'John Miller',
    email: 'john@correo.com',
    nativeLanguage: 'en',
    level: 'B1',
  },
  {
    id: '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83',
    name: 'Emma Schmidt',
    email: 'emma@correo.com',
    nativeLanguage: 'de',
    level: 'A2',
  },
]

// Comportamiento que toda implementación de TeacherService debe cumplir
export function describeTeacherServiceContract(createService: (students: Student[]) => TeacherService) {
  describe('contrato de TeacherService', () => {
    it('devuelve los alumnos asignados al docente con sesión', async () => {
      await expect(createService(TEST_STUDENTS).getAssignedStudents()).resolves.toEqual(TEST_STUDENTS)
    })

    it('devuelve una lista vacía si el docente no tiene alumnos', async () => {
      await expect(createService([]).getAssignedStudents()).resolves.toEqual([])
    })
  })
}
