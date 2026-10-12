import type { User } from '../../domain/user'
import { createMockTeacherService } from './mockTeacherService'

const TEACHER: User = { name: 'María López', email: 'docente@colegio.edu', role: 'docente' }
const STUDENTS = [{ id: 1, name: 'Ana Gómez', email: 'ana@colegio.edu' }]

describe('mockTeacherService', () => {
  it('devuelve los alumnos asignados al docente', async () => {
    const service = createMockTeacherService({ students: { [TEACHER.email]: STUDENTS }, delayMs: 0 })

    await expect(service.getAssignedStudents(TEACHER)).resolves.toEqual(STUDENTS)
  })

  it('devuelve una lista vacía si el docente no tiene alumnos', async () => {
    const service = createMockTeacherService({ students: {}, delayMs: 0 })

    await expect(service.getAssignedStudents(TEACHER)).resolves.toEqual([])
  })
})
