from uuid import UUID

from app.domain.entities import StudentDetail, User
from app.domain.policies import require_own_student
from app.domain.ports import Clock, LessonRepository, StudentRepository


class GetTeacherStudent:
    def __init__(self, students: StudentRepository, lessons: LessonRepository, clock: Clock) -> None:
        self._students = students
        self._lessons = lessons
        self._clock = clock

    def execute(self, requester: User, student_id: UUID) -> StudentDetail:
        student = require_own_student(requester, student_id, self._students)
        lessons_count = self._lessons.count_completed_by_student(student.id, until=self._clock.now())
        return StudentDetail(student=student, lessons_count=lessons_count)
