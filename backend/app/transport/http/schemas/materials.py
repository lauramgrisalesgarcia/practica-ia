from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints
from pydantic.json_schema import SkipJsonSchema

from datetime import datetime

from app.domain.entities import ActivityType, Grade, Material, StudentMaterialView, Submission
from app.transport.http.schemas.lessons import Option, TeacherMaterialOut

Keyword = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class GenerateMaterialIn(BaseModel):
    activity_type: ActivityType
    exercise_count: int = Field(ge=1, le=15)
    keywords: Annotated[list[Keyword], Field(min_length=1, max_length=20)] | SkipJsonSchema[None] = Field(
        default=None,
        description=(
            "Palabras clave revisadas por el docente. Opcional: si se omite se usan las de la clase. "
            "No modifica las palabras clave guardadas en la clase."
        ),
    )


class GeneratedMaterialOut(TeacherMaterialOut):
    lesson_id: UUID

    @classmethod
    def from_material(cls, lesson_id: UUID, material: Material) -> "GeneratedMaterialOut":
        base = TeacherMaterialOut.from_entity(material)
        return cls(lesson_id=lesson_id, **base.model_dump())



class ExerciseForStudentOut(BaseModel):
    """Ejercicio tal como lo ve el estudiante: sin `correct_option` (el campo no existe en este schema)."""

    id: int
    sentence: str
    options: list[Option] = Field(min_length=2, max_length=4, json_schema_extra={"uniqueItems": True})


class ExerciseResultOut(BaseModel):
    exercise_id: int
    selected_option: str
    correct_option: str
    is_correct: bool


class SubmissionOut(BaseModel):
    lesson_id: UUID
    submitted_at: datetime
    correct_count: int = Field(ge=0)
    incorrect_count: int = Field(ge=0)
    score: float = Field(ge=0, le=100, description="Porcentaje de aciertos con 2 decimales")
    results: list[ExerciseResultOut]
    feedback: str
    recommendations: list[Annotated[str, Field(min_length=1)]] = Field(min_length=1, max_length=5)

    @classmethod
    def from_entity(cls, lesson_id: UUID, submission: Submission, grade: Grade) -> "SubmissionOut":
        return cls(
            lesson_id=lesson_id,
            submitted_at=submission.submitted_at,
            correct_count=submission.correct_count,
            incorrect_count=submission.incorrect_count,
            score=float(submission.score),
            results=[
                ExerciseResultOut(
                    exercise_id=result.exercise_id,
                    selected_option=result.selected_option,
                    correct_option=result.correct_option,
                    is_correct=result.is_correct,
                )
                for result in grade.results
            ],
            feedback=submission.feedback,
            recommendations=list(submission.recommendations),
        )


class StudentMaterialOut(BaseModel):
    lesson_id: UUID
    activity_type: ActivityType
    title: str
    instructions: str
    exercises: list[ExerciseForStudentOut] = Field(min_length=1, max_length=15)
    submission: SubmissionOut | None

    @classmethod
    def from_entity(cls, view: StudentMaterialView) -> "StudentMaterialOut":
        material = view.material
        submission = (
            SubmissionOut.from_entity(view.lesson_id, view.submission, view.grade)
            if view.submission and view.grade
            else None
        )
        return cls(
            lesson_id=view.lesson_id,
            activity_type=material.activity_type,
            title=material.title,
            instructions=material.instructions,
            exercises=[
                ExerciseForStudentOut(id=exercise.id, sentence=exercise.sentence, options=list(exercise.options))
                for exercise in material.exercises
            ],
            submission=submission,
        )
