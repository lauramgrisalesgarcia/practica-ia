import { toStudentSummary, type StudentDetail } from '@/domain/student'
import type { TeacherService } from '@/features/teacher/services/teacherService'

export const TEST_STUDENTS: StudentDetail[] = [
  {
    id: 'b71e4a90-2c5d-4f3e-8a1b-6d7c8e9f0a12',
    name: 'John Miller',
    email: 'john@correo.com',
    nativeLanguage: 'en',
    level: 'B1',
    lessonsCount: 8,
  },
  {
    id: '3f2b8c1e-9a4d-4e7b-b6a2-1c9d0e5f7a83',
    name: 'Emma Schmidt',
    email: 'emma@correo.com',
    nativeLanguage: 'de',
    level: 'A2',
    lessonsCount: 12,
  },
]

// Comportamiento que toda implementación de TeacherService debe cumplir
export function describeTeacherServiceContract(createService: (students: StudentDetail[]) => TeacherService) {
  describe('contrato de TeacherService', () => {
    it('devuelve los alumnos asignados al docente con sesión', async () => {
      await expect(createService(TEST_STUDENTS).getAssignedStudents()).resolves.toEqual(TEST_STUDENTS.map(toStudentSummary))
    })

    it('devuelve una lista vacía si el docente no tiene alumnos', async () => {
      await expect(createService([]).getAssignedStudents()).resolves.toEqual([])
    })

    it('devuelve el detalle de un alumno asignado', async () => {
      const [, emma] = TEST_STUDENTS

      await expect(createService(TEST_STUDENTS).getStudent(emma.id)).resolves.toEqual(emma)
    })

    it('rechaza un alumno inexistente o asignado a otro docente', async () => {
      await expect(createService(TEST_STUDENTS).getStudent('00000000-0000-4000-8000-000000000000')).rejects.toThrow(
        'Estudiante no encontrado',
      )
    })
  })
}
