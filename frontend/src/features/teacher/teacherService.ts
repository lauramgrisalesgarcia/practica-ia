import type { Student, StudentDetail } from '../../domain/student'

export interface TeacherService {
  // Alumnos asignados al docente con sesión iniciada
  getAssignedStudents: () => Promise<Student[]>
  // Falla con «Estudiante no encontrado» si no existe o es de otro docente
  getStudent: (studentId: string) => Promise<StudentDetail>
}
