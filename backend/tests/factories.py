from datetime import datetime

from sqlalchemy.orm import Session

from app.core.password_hasher import Argon2PasswordHasher
from app.domain.entities import Level, Role
from app.persistence.models import LessonModel, StudentProfileModel, UserModel

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
        pdf_path=f"lessons/{student.id}/{pdf_filename}",
    )
    session.add(lesson)
    session.flush()
    return lesson
