from datetime import datetime
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.domain.entities import LessonSummary, MaterialStatus
from app.domain.ports import LessonRepository
from app.persistence.models import LessonModel, MaterialSubmissionModel, ReinforcementMaterialModel, UserModel

_MATERIAL_STATUS = case(
    (MaterialSubmissionModel.id.is_not(None), MaterialStatus.COMPLETED.value),
    (ReinforcementMaterialModel.id.is_not(None), MaterialStatus.PENDING.value),
    else_=MaterialStatus.NONE.value,
)


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

    def list_completed_by_student(self, student_id: UUID, until: datetime) -> list[LessonSummary]:
        rows = self._session.execute(
            select(LessonModel, _MATERIAL_STATUS)
            .join(UserModel, UserModel.id == LessonModel.student_id)
            .outerjoin(ReinforcementMaterialModel, ReinforcementMaterialModel.lesson_id == LessonModel.id)
            .outerjoin(MaterialSubmissionModel, MaterialSubmissionModel.material_id == ReinforcementMaterialModel.id)
            .where(UserModel.public_id == student_id, LessonModel.date <= until)
            .order_by(LessonModel.date.desc())
        ).all()
        return [
            LessonSummary(
                id=lesson.public_id,
                date=lesson.date,
                duration_minutes=lesson.duration_minutes,
                topic=lesson.topic,
                context=lesson.context,
                material_status=MaterialStatus(status),
            )
            for lesson, status in rows
        ]
