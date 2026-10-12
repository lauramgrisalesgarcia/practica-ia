from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy.orm import Session

from app.core.password_hasher import Argon2PasswordHasher
from app.domain.entities import Level, Role
from app.persistence.models import (
    LessonModel,
    MaterialSubmissionModel,
    ReinforcementMaterialModel,
    StudentProfileModel,
    UserModel,
)

_hasher = Argon2PasswordHasher()


def create_user(
    session: Session,
    *,
    email: str = "docente@colegio.edu",
    password: str = "Docente#2026",
    role: Role = Role.DOCENTE,
    first_name: str = "María",
    last_name: str = "López",
) -> UserModel:
    user = UserModel(
        first_name=first_name,
        last_name=last_name,
        email=email.lower(),
        password_hash=_hasher.hash(password),
        role=role,
    )
    session.add(user)
    session.flush()
    return user


def create_student(
    session: Session,
    *,
    teacher: UserModel,
    email: str = "emma@correo.com",
    first_name: str = "Emma",
    last_name: str = "Schmidt",
    native_language: str = "de",
    level: Level = Level.A2,
) -> UserModel:
    student = create_user(
        session, email=email, role=Role.ESTUDIANTE, first_name=first_name, last_name=last_name
    )
    session.add(
        StudentProfileModel(
            user_id=student.id, teacher_id=teacher.id, native_language=native_language, level=level
        )
    )
    session.flush()
    return student


def create_lesson(
    session: Session,
    *,
    student: UserModel,
    teacher: UserModel,
    date: datetime,
    duration_minutes: int = 60,
    topic: str = "Pedir en un restaurante",
    context: str = "Pedir comida y bebida en un restaurante y pedir la cuenta",
    keywords: list[str] | None = None,
    notes: str | None = None,
    pdf_filename: str = "restaurante-a2.pdf",
    pdf_path: str | None = None,
) -> LessonModel:
    lesson = LessonModel(
        student_id=student.id,
        teacher_id=teacher.id,
        date=date,
        duration_minutes=duration_minutes,
        topic=topic,
        context=context,
        keywords=keywords or ["la carta", "quisiera", "la cuenta"],
        notes=notes,
        pdf_filename=pdf_filename,
        pdf_path=pdf_path or f"lessons/{student.id}/{pdf_filename}",
    )
    session.add(lesson)
    session.flush()
    return lesson


def create_material(session: Session, *, lesson: LessonModel, exercise_count: int = 1) -> ReinforcementMaterialModel:
    exercises = [
        {"id": n, "sentence": f"Frase ___ {n}", "options": ["a", "b"], "correct_option": "a"}
        for n in range(1, exercise_count + 1)
    ]
    material = ReinforcementMaterialModel(
        lesson_id=lesson.id,
        activity_type="complete_sentence",
        exercise_count=exercise_count,
        llm_request={"task": "generate_reinforcement_material"},
        content={"title": "Actividad", "instructions": "Completa", "exercises": exercises},
    )
    session.add(material)
    session.flush()
    return material


def create_submission(
    session: Session,
    *,
    material: ReinforcementMaterialModel,
    student: UserModel,
    answers: list[dict[str, Any]] | None = None,
    correct_count: int = 1,
    incorrect_count: int = 0,
    score: Decimal = Decimal("100.00"),
) -> MaterialSubmissionModel:
    submission = MaterialSubmissionModel(
        material_id=material.id,
        student_id=student.id,
        answers=answers or [{"exercise_id": 1, "selected_option": "a"}],
        correct_count=correct_count,
        incorrect_count=incorrect_count,
        score=score,
        recommendations={"feedback": "¡Muy bien!", "recommendations": ["Sigue así."]},
    )
    session.add(submission)
    session.flush()
    return submission
