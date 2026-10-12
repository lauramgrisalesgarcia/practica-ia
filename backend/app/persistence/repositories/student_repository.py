from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities import Student
from app.domain.ports import StudentRepository
from app.persistence.models import StudentProfileModel, UserModel


class SqlAlchemyStudentRepository(StudentRepository):
    """Implementa `StudentRepository` del dominio sobre PostgreSQL."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_by_teacher(self, teacher_id: int) -> list[Student]:
        rows = self._session.execute(
            select(UserModel, StudentProfileModel)
            .join(StudentProfileModel, StudentProfileModel.user_id == UserModel.id)
            .where(StudentProfileModel.teacher_id == teacher_id)
            .order_by(UserModel.last_name, UserModel.first_name)
        ).all()
        return [_to_entity(user, profile) for user, profile in rows]

    def get_for_teacher(self, teacher_id: int, student_id: int) -> Student | None:
        row = self._session.execute(
            select(UserModel, StudentProfileModel)
            .join(StudentProfileModel, StudentProfileModel.user_id == UserModel.id)
            .where(StudentProfileModel.teacher_id == teacher_id, UserModel.id == student_id)
        ).one_or_none()
        return _to_entity(*row) if row else None


def _to_entity(user: UserModel, profile: StudentProfileModel) -> Student:
    return Student(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        native_language=profile.native_language,
        level=profile.level,
    )
