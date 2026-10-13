from collections.abc import Mapping
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.entities import Material, Submission
from app.domain.errors import SubmissionAlreadyExistsError
from app.domain.ports import MaterialRepository
from app.persistence.mappers import to_material, to_material_content, to_submission
from app.persistence.models import LessonModel, MaterialSubmissionModel, ReinforcementMaterialModel, UserModel


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

    def save_submission(self, lesson_id: UUID, student_id: UUID, submission: Submission) -> None:
        material_pk = self._session.scalar(
            select(ReinforcementMaterialModel.id)
            .join(LessonModel, LessonModel.id == ReinforcementMaterialModel.lesson_id)
            .where(LessonModel.public_id == lesson_id)
        )
        student_pk = self._session.scalar(select(UserModel.id).where(UserModel.public_id == student_id))
        if material_pk is None or student_pk is None:
            raise LookupError("El material o el estudiante no existen")

        model = MaterialSubmissionModel(
            material_id=material_pk,
            student_id=student_pk,
            answers=[
                {"exercise_id": answer.exercise_id, "selected_option": answer.selected_option}
                for answer in submission.answers
            ],
            correct_count=submission.correct_count,
            incorrect_count=submission.incorrect_count,
            score=submission.score,
            recommendations={
                "feedback": submission.feedback,
                "recommendations": list(submission.recommendations),
            },
            submitted_at=submission.submitted_at,
        )
        # La restricción única de material_id garantiza un único intento, incluso con envíos
        # simultáneos. El savepoint permite deshacer solo este insert si se viola.
        try:
            with self._session.begin_nested():
                self._session.add(model)
        except IntegrityError as error:
            raise SubmissionAlreadyExistsError from error
