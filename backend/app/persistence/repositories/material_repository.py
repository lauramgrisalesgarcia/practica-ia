from collections.abc import Mapping
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities import Material, Submission
from app.domain.ports import MaterialRepository
from app.persistence.mappers import to_material, to_material_content, to_submission
from app.persistence.models import LessonModel, MaterialSubmissionModel, ReinforcementMaterialModel


class SqlAlchemyMaterialRepository(MaterialRepository):
    """Implementa `MaterialRepository` del dominio sobre PostgreSQL."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def save(self, lesson_id: UUID, llm_request: Mapping[str, Any], material: Material) -> None:
        lesson_pk = self._session.scalar(select(LessonModel.id).where(LessonModel.public_id == lesson_id))
        if lesson_pk is None:
            raise LookupError("La clase no existe")

        model = self._session.scalar(
            select(ReinforcementMaterialModel).where(ReinforcementMaterialModel.lesson_id == lesson_pk)
        )
        if model is None:
            model = ReinforcementMaterialModel(lesson_id=lesson_pk)
            self._session.add(model)
        # Regenerar reemplaza el material anterior (una clase tiene como máximo un material vigente).
        model.activity_type = material.activity_type.value
        model.exercise_count = material.exercise_count
        model.llm_request = dict(llm_request)
        model.content = to_material_content(material)
        model.generated_at = material.generated_at
        self._session.flush()

    def get_for_lesson(self, lesson_id: UUID) -> tuple[Material, Submission | None] | None:
        row = self._session.execute(
            select(ReinforcementMaterialModel, MaterialSubmissionModel)
            .join(LessonModel, LessonModel.id == ReinforcementMaterialModel.lesson_id)
            .outerjoin(MaterialSubmissionModel, MaterialSubmissionModel.material_id == ReinforcementMaterialModel.id)
            .where(LessonModel.public_id == lesson_id)
        ).one_or_none()
        if row is None:
            return None
        material, submission = row
        return to_material(material), to_submission(submission) if submission else None
