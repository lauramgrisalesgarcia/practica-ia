import { toStudentSummary, type StudentDetail } from '@/domain/student'
import { DEV_DELAY_MS, wait } from '@/dev/wait'
import type { TeacherService } from './teacherService'

interface MockTeacherServiceOptions {
  students: StudentDetail[]
  delayMs?: number
}

// Servicio en memoria para desarrollar sin backend
export function createMockTeacherService({ students, delayMs = DEV_DELAY_MS }: MockTeacherServiceOptions): TeacherService {
  return {
    async getAssignedStudents() {
      await wait(delayMs)
      return students.map(toStudentSummary)
    },
    async getStudent(studentId) {
      await wait(delayMs)
      const student = students.find((s) => s.id === studentId)
      if (!student) throw new Error('Estudiante no encontrado')
      return student
    },
  }
}
