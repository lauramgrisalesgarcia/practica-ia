"""Datos de prueba para desarrollo local.

Uso (desde backend/):  uv run python -m app.persistence.seed

La contraseña de todos los usuarios de prueba se lee de SEED_USER_PASSWORD (`.env`); nunca
está escrita en el código. El script es idempotente: si los datos ya existen, no hace nada.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.password_hasher import Argon2PasswordHasher
from app.domain.entities import Level, Role
from app.domain.ports import FileStorage
from app.persistence.models import LessonModel, StudentProfileModel, UserModel
from app.persistence.sample_pdf import build_sample_pdf


@dataclass(frozen=True)
class _Person:
    first_name: str
    last_name: str
    email: str


@dataclass(frozen=True)
class _StudentSeed(_Person):
    teacher_email: str
    native_language: str
    level: Level


@dataclass(frozen=True)
class _LessonSeed:
    student_email: str
    days_from_now: int
    topic: str
    context: str
    keywords: tuple[str, ...]
    notes: str | None
    pdf_filename: str


TEACHERS = (
    _Person("María", "López", "docente@colegio.edu"),
    _Person("Carlos", "Ruiz", "carlos.ruiz@colegio.edu"),
)

STUDENTS = (
    _StudentSeed("Emma", "Schmidt", "emma@correo.com", "docente@colegio.edu", "de", Level.A2),
    _StudentSeed("John", "Miller", "john@correo.com", "docente@colegio.edu", "en", Level.B1),
    _StudentSeed("Pierre", "Dubois", "pierre@correo.com", "docente@colegio.edu", "fr", Level.A1),
    _StudentSeed("Yuki", "Tanaka", "yuki@correo.com", "carlos.ruiz@colegio.edu", "ja", Level.B2),
)

LESSONS = (
    _LessonSeed(
        "emma@correo.com", -14, "Presentarse", "Presentarse y hablar de la familia en una reunión",
        ("me llamo", "soy de", "tengo", "hermanos"), None, "presentaciones-a2.pdf",
    ),
    _LessonSeed(
        "emma@correo.com", -4, "Pedir en un restaurante",
        "Pedir comida y bebida en un restaurante y pedir la cuenta",
        ("la carta", "quisiera", "de primero", "la cuenta", "para beber"),
        "Confunde 'quiero' y 'quisiera'. Le cuesta el orden primero/segundo/postre.",
        "restaurante-a2.pdf",
    ),
    _LessonSeed(
        "emma@correo.com", 3, "En el médico", "Describir síntomas en una consulta médica",
        ("me duele", "tengo fiebre", "la receta"), None, "medico-a2.pdf",
    ),
    _LessonSeed(
        "john@correo.com", -7, "Planes de viaje", "Reservar un hotel y preguntar por actividades",
        ("reservar", "habitación doble", "me gustaría", "¿se puede…?"),
        "Buen uso del condicional. Repasar preposiciones de lugar.", "viajes-b1.pdf",
    ),
    _LessonSeed(
        "pierre@correo.com", -2, "Los números y la hora", "Preguntar la hora y quedar con amigos",
        ("¿qué hora es?", "a las", "y media", "menos cuarto"), None, "la-hora-a1.pdf",
    ),
    _LessonSeed(
        "yuki@correo.com", -5, "Opiniones y debates", "Dar y defender una opinión en un debate",
        ("creo que", "no estoy de acuerdo", "por un lado", "sin embargo"), None, "debate-b2.pdf",
    ),
)


def seed(session: Session, *, password: str, now: datetime, files: FileStorage) -> bool:
    """Inserta los datos de prueba y guarda un PDF de ejemplo por clase.

    Devuelve False si ya existían (no hace nada).
    """
    if session.scalar(select(UserModel.id).where(UserModel.email == TEACHERS[0].email)) is not None:
        return False

    password_hash = Argon2PasswordHasher().hash(password)
    users: dict[str, UserModel] = {}

    def add_user(person: _Person, role: Role) -> UserModel:
        user = UserModel(
            first_name=person.first_name,
            last_name=person.last_name,
            email=person.email,
            password_hash=password_hash,
            role=role,
        )
        session.add(user)
        users[person.email] = user
        return user

    for teacher in TEACHERS:
        add_user(teacher, Role.DOCENTE)
    session.flush()

    for student in STUDENTS:
        add_user(student, Role.ESTUDIANTE)
    session.flush()
    for student in STUDENTS:
        session.add(
            StudentProfileModel(
                user_id=users[student.email].id,
                teacher_id=users[student.teacher_email].id,
                native_language=student.native_language,
                level=student.level,
            )
        )

    teacher_of = {student.email: student.teacher_email for student in STUDENTS}
    for lesson in LESSONS:
        student_user = users[lesson.student_email]
        pdf_path = f"lessons/{student_user.public_id}/{lesson.pdf_filename}"
        files.write(
            pdf_path,
            build_sample_pdf(
                lesson.topic,
                [lesson.context, "", "Palabras clave:", *(f"- {keyword}" for keyword in lesson.keywords)],
            ),
        )
        session.add(
            LessonModel(
                student_id=student_user.id,
                teacher_id=users[teacher_of[lesson.student_email]].id,
                date=(now + timedelta(days=lesson.days_from_now)).replace(hour=16, minute=0, second=0, microsecond=0),
                duration_minutes=60,
                topic=lesson.topic,
                context=lesson.context,
                keywords=list(lesson.keywords),
                notes=lesson.notes,
                pdf_filename=lesson.pdf_filename,
                pdf_path=pdf_path,
            )
        )
    session.flush()
    return True


class _SeedSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    seed_user_password: SecretStr = Field(min_length=12)


def main() -> None:
    from app.core.config import get_settings
    from app.persistence.database import SessionLocal
    from app.persistence.file_storage import LocalFileStorage

    password = _SeedSettings().seed_user_password.get_secret_value()
    files = LocalFileStorage(get_settings().storage_dir)
    with SessionLocal() as session:
        created = seed(session, password=password, now=datetime.now(UTC), files=files)
        session.commit()

    if not created:
        print("Los datos de prueba ya existían; no se ha modificado nada.")
        return
    print("Datos de prueba creados. Contraseña de todos los usuarios: SEED_USER_PASSWORD en backend/.env")
    for person in TEACHERS:
        print(f"  docente     {person.email}")
    for student in STUDENTS:
        print(f"  estudiante  {student.email}  (docente: {student.teacher_email})")


if __name__ == "__main__":
    main()
