"""Conversión de modelos SQLAlchemy a entidades del dominio (compartida por los repositories)."""

from typing import Any

from app.domain.entities import (
    ActivityType,
    Exercise,
    LessonSummary,
    Material,
    MaterialStatus,
    Student,
    SubmissionSummary,
)
from app.persistence.models import (
    LessonModel,
    MaterialSubmissionModel,
    ReinforcementMaterialModel,
    StudentProfileModel,
    UserModel,
)


def to_student(user: UserModel, profile: StudentProfileModel) -> Student:
    return Student(
        id=user.public_id,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        native_language=profile.native_language,
        level=profile.level,
    )


def to_lesson_summary(lesson: LessonModel, material_status: str) -> LessonSummary:
    return LessonSummary(
        id=lesson.public_id,
        date=lesson.date,
        duration_minutes=lesson.duration_minutes,
        topic=lesson.topic,
        context=lesson.context,
        material_status=MaterialStatus(material_status),
    )


def to_material(model: ReinforcementMaterialModel) -> Material:
    content: dict[str, Any] = model.content
    return Material(
        generated_at=model.generated_at,
        activity_type=ActivityType(model.activity_type),
        exercise_count=model.exercise_count,
        title=content["title"],
        instructions=content["instructions"],
        exercises=tuple(
            Exercise(
                id=exercise["id"],
                sentence=exercise["sentence"],
                options=tuple(exercise["options"]),
                correct_option=exercise["correct_option"],
            )
            for exercise in content["exercises"]
        ),
    )


def to_submission_summary(model: MaterialSubmissionModel) -> SubmissionSummary:
    return SubmissionSummary(
        submitted_at=model.submitted_at,
        correct_count=model.correct_count,
        incorrect_count=model.incorrect_count,
        score=model.score,
    )


def to_material_content(material: Material) -> dict[str, Any]:
    """Contenido JSONB del material (el tipo de actividad y la cantidad van en columnas propias)."""
    return {
        "title": material.title,
        "instructions": material.instructions,
        "exercises": [
            {
                "id": exercise.id,
                "sentence": exercise.sentence,
                "options": list(exercise.options),
                "correct_option": exercise.correct_option,
            }
            for exercise in material.exercises
        ],
    }
