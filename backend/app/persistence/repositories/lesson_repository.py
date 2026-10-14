from datetime import datetime
from uuid import UUID

from sqlalchemy import ColumnElement, case, func, select
from sqlalchemy.orm import Session, aliased

from app.domain.entities import (
    GenerationContext,
    LessonContext,
    LessonDetail,
    LessonPdfLocation,
    LessonSummary,
    MaterialStatus,
)
from app.domain.ports import LessonRepository
from app.persistence.mappers import to_lesson_summary, to_material, to_student, to_submission_summary
from app.persistence.models import (
    LessonModel,
    MaterialSubmissionModel,
    ReinforcementMaterialModel,
    StudentProfileModel,
    UserModel,
)

_Teacher = aliased(UserModel)

_MATERIAL_STATUS = case(
    (MaterialSubmissionModel.id.is_not(None), MaterialStatus.COMPLETED.value),
    (ReinforcementMaterialModel.id.is_not(None), MaterialStatus.PENDING.value),
    else_=MaterialStatus.NONE.value,
)


def _of_teacher(teacher_id: UUID) -> ColumnElement[bool]:
    """Condición: la clase es de un estudiante asignado al docente (requiere el join con `_Teacher`)."""
    return _Teacher.public_id == teacher_id


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
            select(LessonModel, _MATERIAL_STATUS, MaterialSubmissionModel.score)
            .join(UserModel, UserModel.id == LessonModel.student_id)
            .outerjoin(ReinforcementMaterialModel, ReinforcementMaterialModel.lesson_id == LessonModel.id)
            .outerjoin(MaterialSubmissionModel, MaterialSubmissionModel.material_id == ReinforcementMaterialModel.id)
            .where(UserModel.public_id == student_id, LessonModel.date <= until)
            .order_by(LessonModel.date.desc())
        ).all()
        return [to_lesson_summary(lesson, status, score) for lesson, status, score in rows]

    def get_detail_for_teacher(self, teacher_id: UUID, lesson_id: UUID) -> LessonDetail | None:
        row = self._session.execute(
            select(
                LessonModel,
                UserModel,
                StudentProfileModel,
                ReinforcementMaterialModel,
                MaterialSubmissionModel,
                _MATERIAL_STATUS,
            )
            .join(UserModel, UserModel.id == LessonModel.student_id)
            .join(StudentProfileModel, StudentProfileModel.user_id == UserModel.id)
            .join(_Teacher, _Teacher.id == StudentProfileModel.teacher_id)
            .outerjoin(ReinforcementMaterialModel, ReinforcementMaterialModel.lesson_id == LessonModel.id)
            .outerjoin(MaterialSubmissionModel, MaterialSubmissionModel.material_id == ReinforcementMaterialModel.id)
            .where(_of_teacher(teacher_id), LessonModel.public_id == lesson_id)
        ).one_or_none()
        if row is None:
            return None
        lesson, student, profile, material, submission, status = row
        return LessonDetail(
            summary=to_lesson_summary(lesson, status, submission.score if submission else None),
            keywords=tuple(lesson.keywords),
            notes=lesson.notes,
            student=to_student(student, profile),
            material=to_material(material) if material else None,
            submission=to_submission_summary(submission) if submission else None,
        )

    def get_pdf_for_teacher(self, teacher_id: UUID, lesson_id: UUID) -> LessonPdfLocation | None:
        row = self._session.execute(
            select(LessonModel.pdf_filename, LessonModel.pdf_path)
            .join(StudentProfileModel, StudentProfileModel.user_id == LessonModel.student_id)
            .join(_Teacher, _Teacher.id == StudentProfileModel.teacher_id)
            .where(_of_teacher(teacher_id), LessonModel.public_id == lesson_id)
        ).one_or_none()
        return LessonPdfLocation(filename=row[0], path=row[1]) if row else None

    def get_context_for_student(self, student_id: UUID, lesson_id: UUID) -> LessonContext | None:
        row = self._session.execute(
            select(LessonModel, StudentProfileModel)
            .join(UserModel, UserModel.id == LessonModel.student_id)
            .join(StudentProfileModel, StudentProfileModel.user_id == UserModel.id)
            .where(UserModel.public_id == student_id, LessonModel.public_id == lesson_id)
        ).one_or_none()
        if row is None:
            return None
        lesson, profile = row
        return LessonContext(
            lesson_id=lesson.public_id,
            topic=lesson.topic,
            context=lesson.context,
            keywords=tuple(lesson.keywords),
            student_level=profile.level,
            native_language=profile.native_language,
        )

    def exists_for_student(self, student_id: UUID, lesson_id: UUID) -> bool:
        found = self._session.scalar(
            select(LessonModel.id)
            .join(UserModel, UserModel.id == LessonModel.student_id)
            .where(UserModel.public_id == student_id, LessonModel.public_id == lesson_id)
        )
        return found is not None

    def get_pdf_for_student(self, student_id: UUID, lesson_id: UUID) -> LessonPdfLocation | None:
        row = self._session.execute(
            select(LessonModel.pdf_filename, LessonModel.pdf_path)
            .join(UserModel, UserModel.id == LessonModel.student_id)
            .where(UserModel.public_id == student_id, LessonModel.public_id == lesson_id)
        ).one_or_none()
        return LessonPdfLocation(filename=row[0], path=row[1]) if row else None

    def get_generation_context_for_teacher(self, teacher_id: UUID, lesson_id: UUID) -> GenerationContext | None:
        row = self._session.execute(
            select(LessonModel, StudentProfileModel, MaterialSubmissionModel.id)
            .join(StudentProfileModel, StudentProfileModel.user_id == LessonModel.student_id)
            .join(_Teacher, _Teacher.id == StudentProfileModel.teacher_id)
            .outerjoin(ReinforcementMaterialModel, ReinforcementMaterialModel.lesson_id == LessonModel.id)
            .outerjoin(MaterialSubmissionModel, MaterialSubmissionModel.material_id == ReinforcementMaterialModel.id)
            .where(_of_teacher(teacher_id), LessonModel.public_id == lesson_id)
        ).one_or_none()
        if row is None:
            return None
        lesson, profile, submission_id = row
        return GenerationContext(
            lesson_id=lesson.public_id,
            date=lesson.date,
            topic=lesson.topic,
            context=lesson.context,
            keywords=tuple(lesson.keywords),
            notes=lesson.notes,
            pdf_filename=lesson.pdf_filename,
            pdf_path=lesson.pdf_path,
            student_level=profile.level,
            native_language=profile.native_language,
            has_submission=submission_id is not None,
        )
