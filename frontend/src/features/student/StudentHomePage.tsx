import { saveFile } from '../../shared/files/saveFile'
import { MyLessons } from './components/MyLessons'
import type { StudentService } from './services/studentService'

interface StudentHomePageProps {
  name: string
  studentService: StudentService
}

export function StudentHomePage({ name, studentService }: StudentHomePageProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-gray-500">Panel del estudiante</p>
        <h1 className="text-2xl font-semibold text-gray-900">Hola, {name}</h1>
      </header>
      <MyLessons loadLessons={studentService.getMyLessons} downloadPdf={studentService.downloadPdf} openPdf={saveFile} />
    </div>
  )
}
