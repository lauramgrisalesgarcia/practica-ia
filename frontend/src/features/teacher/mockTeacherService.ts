import type { Student } from '../../domain/student'
import { wait } from '../../dev/wait'
import type { TeacherService } from './teacherService'

interface MockTeacherServiceOptions {
  students: Student[]
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockTeacherService({ students, delayMs = 500 }: MockTeacherServiceOptions): TeacherService {
  return {
    async getAssignedStudents() {
      await wait(delayMs)
      return students
    },
  }
}
