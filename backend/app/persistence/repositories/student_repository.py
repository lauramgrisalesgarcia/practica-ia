from uuid import UUID

from sqlalchemy import Select, select
from sqlalchemy.orm import Session, aliased

from app.domain.entities import Student
from app.domain.ports import StudentRepository
from app.persistence.mappers import to_student
from app.persistence.models import StudentProfileModel, UserModel

_Teacher = aliased(UserModel)


class SqlAlchemyStudentRepository(StudentRepository):
    """Implementa `StudentRepository` del dominio sobre PostgreSQL."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_by_teacher(self, teacher_id: UUID) -> list[Student]:
        rows = self._session.execute(
            _students_of(teacher_id).order_by(UserModel.last_name, UserModel.first_name)
        ).all()
        return [to_student(user, profile) for user, profile in rows]

    def get_for_teacher(self, teacher_id: UUID, student_id: UUID) -> Student | None:
        row = self._session.execute(
            _students_of(teacher_id).where(UserModel.public_id == student_id)
        ).one_or_none()
        if row is None:
            return None
        user, profile = row
        return to_student(user, profile)


def _students_of(teacher_id: UUID) -> Select[UserModel, StudentProfileModel]:
    return (
        select(UserModel, StudentProfileModel)
        .join(StudentProfileModel, StudentProfileModel.user_id == UserModel.id)
        .join(_Teacher, _Teacher.id == StudentProfileModel.teacher_id)
        .where(_Teacher.public_id == teacher_id)
    )

