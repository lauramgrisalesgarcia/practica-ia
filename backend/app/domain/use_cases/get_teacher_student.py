from uuid import UUID

from app.domain.entities import Role, StudentDetail, User
from app.domain.errors import AccessDeniedError, StudentNotFoundError
from app.domain.ports import Clock, LessonRepository, StudentRepository


class GetTeacherStudent:
    def __init__(self, students: StudentRepository, lessons: LessonRepository, clock: Clock) -> None:
        self._students = students
        self._lessons = lessons
        self._clock = clock

    def execute(self, requester: User, student_id: UUID) -> StudentDetail:
        if requester.role is not Role.DOCENTE:
            raise AccessDeniedError
        student = self._students.get_for_teacher(requester.id, student_id)
        if student is None:
            raise StudentNotFoundError
        lessons_count = self._lessons.count_completed_by_student(student.id, until=self._clock.now())
        return StudentDetail(student=student, lessons_count=lessons_count)
