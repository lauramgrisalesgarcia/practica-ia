from app.domain.entities import Role, Student, User
from app.domain.errors import AccessDeniedError
from app.domain.ports import StudentRepository


class ListTeacherStudents:
    def __init__(self, students: StudentRepository) -> None:
        self._students = students

    def execute(self, requester: User) -> list[Student]:
        if requester.role is not Role.DOCENTE:
            raise AccessDeniedError
        return self._students.list_by_teacher(requester.id)
