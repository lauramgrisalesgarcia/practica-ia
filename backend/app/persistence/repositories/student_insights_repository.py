from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities import StudentInsightLesson
from app.domain.ports import StudentInsightsRepository
from app.persistence.models import LessonModel, MaterialSubmissionModel, ReinforcementMaterialModel, UserModel


class SqlAlchemyStudentInsightsRepository(StudentInsightsRepository):
    """Implementa `StudentInsightsRepository` del dominio sobre PostgreSQL."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_completed_by_student(self, student_id: UUID, until: datetime) -> list[StudentInsightLesson]:
        rows = self._session.execute(
            select(
                LessonModel.public_id,
                LessonModel.date,
                LessonModel.topic,
                ReinforcementMaterialModel.generated_at,
                ReinforcementMaterialModel.exercise_count,
                MaterialSubmissionModel.submitted_at,
                MaterialSubmissionModel.score,
            )
            .join(UserModel, UserModel.id == LessonModel.student_id)
            .outerjoin(ReinforcementMaterialModel, ReinforcementMaterialModel.lesson_id == LessonModel.id)
            .outerjoin(MaterialSubmissionModel, MaterialSubmissionModel.material_id == ReinforcementMaterialModel.id)
            .where(UserModel.public_id == student_id, LessonModel.date <= until)
            .order_by(LessonModel.date)
        ).all()
        return [
            StudentInsightLesson(
                id=lesson_id,
                date=date,
                topic=topic,
                material_generated_at=generated_at,
                exercise_count=exercise_count,
                submitted_at=submitted_at,
                score=score,
            )
            for lesson_id, date, topic, generated_at, exercise_count, submitted_at, score in rows
        ]
