import { Navigate, Route, Routes, useParams } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { LessonDetailPage } from '@/features/teacher/LessonDetailPage'
import { StudentLessons } from '@/features/teacher/components/StudentLessons'
import { StudentHomePage } from '@/features/student/StudentHomePage'
import { StudentMaterialPage } from '@/features/student/StudentMaterialPage'
import { useSession } from '@/features/auth/session/sessionContext'
import { StudentDetailPage } from '@/features/teacher/StudentDetailPage'
import { TeacherDashboardPage } from '@/features/teacher/TeacherDashboardPage'
import { saveFile } from '@/shared/files/saveFile'
import { homePathFor, LESSON_DETAIL_ROUTE, LOGIN_PATH, STUDENT_DETAIL_ROUTE, STUDENT_LESSON_ROUTE } from '@/shared/routes/paths'
import { AuthenticatedLayout } from './AuthenticatedLayout'
import { RequireRole } from './routes/RequireRole'
import { useServices } from './services/servicesContext'

function HomeRedirect() {
  const session = useSession()
  if (session.status !== 'authenticated') return <Navigate to={LOGIN_PATH} replace />
  return <Navigate to={homePathFor(session.user.role)} replace />
}

function StudentDetailRoute() {
  const { teacherService, teacherLessonService } = useServices()
  const { studentId = '' } = useParams()
  return (
    <div className="flex flex-col gap-6">
      <StudentDetailPage key={studentId} studentId={studentId} loadStudent={teacherService.getStudent} />
      <div className="mx-auto w-full max-w-2xl">
        <StudentLessons key={studentId} studentId={studentId} loadLessons={teacherLessonService.getStudentLessons} />
      </div>
    </div>
  )
}

function LessonDetailRoute() {
  const { teacherLessonService } = useServices()
  const { lessonId = '' } = useParams()
  return (
    <LessonDetailPage
      key={lessonId}
      lessonId={lessonId}
      loadLesson={teacherLessonService.getLesson}
      downloadPdf={teacherLessonService.downloadPdf}
      openPdf={saveFile}
      generateMaterial={teacherLessonService.generateMaterial}
    />
  )
}

function StudentMaterialRoute() {
  const { studentService } = useServices()
  const { lessonId = '' } = useParams()
  return (
    <StudentMaterialPage
      key={lessonId}
      lessonId={lessonId}
      loadMaterial={studentService.getMaterial}
      submitMaterial={studentService.submitMaterial}
    />
  )
}

function App() {
  const { teacherService, studentService, teacherInsightsService } = useServices()
  const session = useSession()

  if (session.status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-mist px-4">
        <p className="text-ink/70">Cargando…</p>
      </main>
    )
  }

  return (
    <Routes>
      <Route path={LOGIN_PATH} element={<LoginPage />} />
      <Route
        path={homePathFor('docente')}
        element={
          <RequireRole role="docente">
            {(user) => (
              <AuthenticatedLayout>
                <TeacherDashboardPage
                  teacherName={user.name}
                  loadStudents={teacherService.getAssignedStudents}
                  loadInsights={teacherInsightsService.getInsights}
                />
              </AuthenticatedLayout>
            )}
          </RequireRole>
        }
      />
      <Route
        path={STUDENT_DETAIL_ROUTE}
        element={
          <RequireRole role="docente">
            {() => (
              <AuthenticatedLayout>
                <StudentDetailRoute />
              </AuthenticatedLayout>
            )}
          </RequireRole>
        }
      />
      <Route
        path={LESSON_DETAIL_ROUTE}
        element={
          <RequireRole role="docente">
            {() => (
              <AuthenticatedLayout>
                <LessonDetailRoute />
              </AuthenticatedLayout>
            )}
          </RequireRole>
        }
      />
      <Route
        path={homePathFor('estudiante')}
        element={
          <RequireRole role="estudiante">
            {(user) => (
              <AuthenticatedLayout>
                <StudentHomePage name={user.name} studentService={studentService} />
              </AuthenticatedLayout>
            )}
          </RequireRole>
        }
      />
      <Route
        path={STUDENT_LESSON_ROUTE}
        element={
          <RequireRole role="estudiante">
            {() => (
              <AuthenticatedLayout>
                <StudentMaterialRoute />
              </AuthenticatedLayout>
            )}
          </RequireRole>
        }
      />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

export default App
