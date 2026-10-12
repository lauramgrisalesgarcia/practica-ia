from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.ports import LessonRepository
from app.persistence.models import LessonModel


class SqlAlchemyLessonRepository(LessonRepository):
    """Implementa `LessonRepository` del dominio sobre PostgreSQL."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def count_completed_by_student(self, student_id: int, until: datetime) -> int:
        count = self._session.scalar(
            select(func.count())
            .select_from(LessonModel)
            .where(LessonModel.student_id == student_id, LessonModel.date <= until)
        )
        return count or 0
