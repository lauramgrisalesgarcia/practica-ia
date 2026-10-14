from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased

from app.domain.entities import InsightLesson
from app.domain.ports import TeacherInsightsRepository
from app.persistence.models import LessonModel, MaterialSubmissionModel, ReinforcementMaterialModel, StudentProfileModel, UserModel

_Teacher = aliased(UserModel)
_Student = aliased(UserModel)


class SqlAlchemyTeacherInsightsRepository(TeacherInsightsRepository):
    """Implementa `TeacherInsightsRepository` del dominio sobre PostgreSQL."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_completed_by_teacher(self, teacher_id: UUID, until: datetime) -> list[InsightLesson]:
        rows = self._session.execute(
            select(
                LessonModel.public_id,
                LessonModel.date,
                _Student.first_name,
                _Student.last_name,
                LessonModel.topic,
                ReinforcementMaterialModel.generated_at,
                MaterialSubmissionModel.submitted_at,
                MaterialSubmissionModel.score,
            )
            .join(_Student, _Student.id == LessonModel.student_id)
            .join(StudentProfileModel, StudentProfileModel.user_id == LessonModel.student_id)
            .join(_Teacher, _Teacher.id == StudentProfileModel.teacher_id)
            .outerjoin(ReinforcementMaterialModel, ReinforcementMaterialModel.lesson_id == LessonModel.id)
            .outerjoin(MaterialSubmissionModel, MaterialSubmissionModel.material_id == ReinforcementMaterialModel.id)
            .where(_Teacher.public_id == teacher_id, LessonModel.date <= until)
            .order_by(LessonModel.date)
        ).all()
        return [
            InsightLesson(
                id=lesson_id,
                date=date,
                student_name=f"{first_name} {last_name}",
                topic=topic,
                material_generated_at=generated_at,
                submitted_at=submitted_at,
                score=score,
            )
            for lesson_id, date, first_name, last_name, topic, generated_at, submitted_at, score in rows
        ]
