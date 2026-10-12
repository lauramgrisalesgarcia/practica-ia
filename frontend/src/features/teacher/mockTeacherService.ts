import type { Student } from '../../domain/student'
import { wait } from '../../dev/wait'
import type { TeacherService } from './teacherService'

interface MockTeacherServiceOptions {
  students: Record<string, Student[]>
  delayMs?: number
}

// Servicio en memoria hasta conectar el frontend con el backend
export function createMockTeacherService({
  students,
  delayMs = 500,
}: MockTeacherServiceOptions): TeacherService {
  return {
    async getAssignedStudents(teacher) {
      await wait(delayMs)
      return students[teacher.email] ?? []
    },
  }
}
