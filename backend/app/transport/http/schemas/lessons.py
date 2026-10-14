from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.entities import (
    ActivityType,
    LessonDetail,
    LessonSummary,
    Level,
    MaterialStatus,
    Material,
    Student,
    SubmissionSummary,
)


class LessonSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: datetime
    duration_minutes: int = Field(ge=1)
    topic: str
    context: str
    material_status: MaterialStatus


class TeacherLessonSummaryOut(LessonSummaryOut):
    keywords: list[str] = Field(min_length=1)
    score: float | None = Field(ge=0, le=100, description="Porcentaje de aciertos, o null si no está resuelto")


class PdfRefOut(BaseModel):
    filename: str
    url: str = Field(description="Ruta de la API para descargar el PDF")


class StudentLessonSummaryOut(LessonSummaryOut):
    pdf: PdfRefOut
    keywords: list[str] = Field(min_length=1)
    score: float | None = Field(ge=0, le=100, description="Porcentaje de aciertos, o null si no está resuelto")

    @classmethod
    def from_entity(cls, summary: LessonSummary, *, pdf_url: str) -> "StudentLessonSummaryOut":
        return cls(
            id=summary.id,
            date=summary.date,
            duration_minutes=summary.duration_minutes,
            topic=summary.topic,
            context=summary.context,
            material_status=summary.material_status,
            pdf=PdfRefOut(filename=summary.pdf_filename, url=pdf_url),
            keywords=list(summary.keywords),
            score=float(summary.score) if summary.score is not None else None,
        )


class LessonStudentOut(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    native_language: str = Field(pattern=r"^[a-z]{2}$")
    level: Level

    @classmethod
    def from_entity(cls, student: Student) -> "LessonStudentOut":
        return cls(
            id=student.id,
            first_name=student.first_name,
            last_name=student.last_name,
            native_language=student.native_language,
            level=student.level,
        )


Option = Annotated[str, Field(min_length=1)]


class ExerciseWithAnswerOut(BaseModel):
    id: int
    sentence: str = Field(description="Frase con exactamente un hueco `___`")
    options: list[Option] = Field(min_length=2, max_length=4, json_schema_extra={"uniqueItems": True})
    correct_option: str


class TeacherMaterialOut(BaseModel):
    generated_at: datetime
    activity_type: ActivityType
    exercise_count: int = Field(ge=1, le=15)
    title: str
    instructions: str
    exercises: list[ExerciseWithAnswerOut] = Field(min_length=1, max_length=15)

    @classmethod
    def from_entity(cls, material: Material) -> "TeacherMaterialOut":
        return cls(
            generated_at=material.generated_at,
            activity_type=material.activity_type,
            exercise_count=material.exercise_count,
            title=material.title,
            instructions=material.instructions,
            exercises=[
                ExerciseWithAnswerOut(
                    id=exercise.id,
                    sentence=exercise.sentence,
                    options=list(exercise.options),
                    correct_option=exercise.correct_option,
                )
                for exercise in material.exercises
            ],
        )


class SubmissionSummaryOut(BaseModel):
    submitted_at: datetime
    correct_count: int = Field(ge=0)
    incorrect_count: int = Field(ge=0)
    score: float = Field(ge=0, le=100, description="Porcentaje de aciertos con 2 decimales")

    @classmethod
    def from_entity(cls, submission: SubmissionSummary) -> "SubmissionSummaryOut":
        return cls(
            submitted_at=submission.submitted_at,
            correct_count=submission.correct_count,
            incorrect_count=submission.incorrect_count,
            score=float(submission.score),
        )


class TeacherLessonDetailOut(LessonSummaryOut):
    keywords: list[str] = Field(min_length=1)
    notes: str | None
    pdf: PdfRefOut
    student: LessonStudentOut
    material: TeacherMaterialOut | None
    submission: SubmissionSummaryOut | None

    @classmethod
    def from_entity(cls, detail: LessonDetail, *, pdf_url: str) -> "TeacherLessonDetailOut":
        summary = detail.summary
        return cls(
            id=summary.id,
            date=summary.date,
            duration_minutes=summary.duration_minutes,
            topic=summary.topic,
            context=summary.context,
            material_status=summary.material_status,
            keywords=list(detail.keywords),
            notes=detail.notes,
            pdf=PdfRefOut(filename=summary.pdf_filename, url=pdf_url),
            student=LessonStudentOut.from_entity(detail.student),
            material=TeacherMaterialOut.from_entity(detail.material) if detail.material else None,
            submission=SubmissionSummaryOut.from_entity(detail.submission) if detail.submission else None,
        )
