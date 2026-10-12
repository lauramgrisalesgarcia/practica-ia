import type { Student } from '../../domain/student'
import type { User } from '../../domain/user'

export interface TeacherService {
  getAssignedStudents: (teacher: User) => Promise<Student[]>
}
