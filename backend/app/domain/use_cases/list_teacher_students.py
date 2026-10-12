from app.domain.entities import Student, User
from app.domain.policies import require_teacher
from app.domain.ports import StudentRepository


class ListTeacherStudents:
    def __init__(self, students: StudentRepository) -> None:
        self._students = students

    def execute(self, requester: User) -> list[Student]:
        require_teacher(requester)
        return self._students.list_by_teacher(requester.id)
