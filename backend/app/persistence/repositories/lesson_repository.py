from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.ports import LessonRepository
from app.persistence.models import LessonModel, UserModel


class SqlAlchemyLessonRepository(LessonRepository):
    """Implementa `LessonRepository` del dominio sobre PostgreSQL."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def count_completed_by_student(self, student_id: UUID, until: datetime) -> int:
        count = self._session.scalar(
            select(func.count())
            .select_from(LessonModel)
            .join(UserModel, UserModel.id == LessonModel.student_id)
            .where(UserModel.public_id == student_id, LessonModel.date <= until)
        )
        return count or 0
