from uuid import UUID

from app.domain.entities import LessonSummary, User
from app.domain.policies import require_own_student
from app.domain.ports import Clock, LessonRepository, StudentRepository


class ListStudentLessons:
    """Historial de clases realizadas de un estudiante del docente."""

    def __init__(self, students: StudentRepository, lessons: LessonRepository, clock: Clock) -> None:
        self._students = students
        self._lessons = lessons
        self._clock = clock

    def execute(self, requester: User, student_id: UUID) -> list[LessonSummary]:
        student = require_own_student(requester, student_id, self._students)
        return self._lessons.list_completed_by_student(student.id, until=self._clock.now())
