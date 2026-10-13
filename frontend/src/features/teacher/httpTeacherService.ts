import type { Level, Student } from '../../domain/student'
import type { HttpClient } from '../../http/httpClient'
import type { TeacherService } from './teacherService'

// Forma del estudiante en la API (docs/openapi.yaml, schema Student)
interface ApiStudent {
  id: string
  first_name: string
  last_name: string
  email: string
  native_language: string
  level: Level
}

function toStudent({ id, first_name, last_name, email, native_language, level }: ApiStudent): Student {
  return { id, name: `${first_name} ${last_name}`, email, nativeLanguage: native_language, level }
}

export function createHttpTeacherService(http: HttpClient): TeacherService {
  return {
    async getAssignedStudents() {
      const students = await http.get<ApiStudent[]>('/teachers/me/students')
      return students.map(toStudent)
    },
  }
}
