import type { Student } from '../../domain/student'

export interface TeacherService {
  // Alumnos asignados al docente con sesión iniciada
  getAssignedStudents: () => Promise<Student[]>
}
