"""Datos de prueba para desarrollo local.

Uso (desde backend/):  uv run python -m app.persistence.seed

La contraseña de todos los usuarios de prueba se lee de SEED_USER_PASSWORD (`.env`); nunca
está escrita en el código. El script es idempotente: crea solo lo que falta (usuarios y
clases, que se identifican por estudiante y tema), así que al añadir clases basta con volver a ejecutarlo.
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
    # Más clases por estudiante para probar la generación de material y el historial
    _LessonSeed(
        "emma@correo.com", -42, "La rutina diaria", "Contar lo que hace en un día normal",
        ("me levanto", "desayuno", "por la tarde", "me acuesto"), None, "rutina-a2.pdf",
    ),
    _LessonSeed(
        "emma@correo.com", -35, "De compras", "Comprar ropa y preguntar precios y tallas",
        ("¿cuánto cuesta?", "la talla", "probarme", "más barato"),
        "Mezcla 'este' y 'esta'. Buena pronunciación.", "compras-a2.pdf",
    ),
    _LessonSeed(
        "emma@correo.com", -28, "El tiempo libre", "Hablar de aficiones y proponer planes",
        ("me gusta", "los fines de semana", "¿quedamos?", "a menudo"), None, "tiempo-libre-a2.pdf",
    ),
    _LessonSeed(
        "emma@correo.com", -21, "Mi casa", "Describir la vivienda y las habitaciones",
        ("el salón", "la cocina", "al lado de", "hay"), "Confunde 'hay' y 'está'.", "mi-casa-a2.pdf",
    ),
    _LessonSeed(
        "emma@correo.com", 10, "Pedir direcciones", "Preguntar y entender cómo llegar a un sitio",
        ("¿dónde está?", "todo recto", "a la derecha", "cerca de"), None, "direcciones-a2.pdf",
    ),
    _LessonSeed(
        "john@correo.com", -49, "Entrevista de trabajo", "Hablar de la experiencia y las habilidades",
        ("he trabajado", "se me da bien", "experiencia", "puesto"),
        "Le falta seguridad con el pretérito perfecto.", "entrevista-b1.pdf",
    ),
    _LessonSeed(
        "john@correo.com", -38, "Recuerdos de la infancia", "Contar experiencias pasadas con el imperfecto",
        ("cuando era pequeño", "solía", "todos los veranos", "me encantaba"), None, "infancia-b1.pdf",
    ),
    _LessonSeed(
        "john@correo.com", -30, "Salud y hábitos", "Dar consejos sobre hábitos saludables",
        ("deberías", "te recomiendo", "es importante que", "hacer ejercicio"),
        "Aún no domina el subjuntivo tras 'es importante que'.", "salud-b1.pdf",
    ),
    _LessonSeed(
        "john@correo.com", -21, "Quejas y reclamaciones", "Reclamar un producto defectuoso en una tienda",
        ("no funciona", "quería devolver", "el ticket", "un reembolso"), None, "reclamaciones-b1.pdf",
    ),
    _LessonSeed(
        "john@correo.com", -14, "Noticias de actualidad", "Comentar una noticia y reaccionar",
        ("según", "me sorprende que", "parece que", "en cambio"), None, "noticias-b1.pdf",
    ),
    _LessonSeed(
        "john@correo.com", 5, "Planes para el futuro", "Hablar de metas con el futuro y el condicional",
        ("voy a", "cuando termine", "me gustaría", "espero"), None, "futuro-b1.pdf",
    ),
    _LessonSeed(
        "pierre@correo.com", -45, "Saludos y despedidas", "Saludar y despedirse en distintas situaciones",
        ("hola", "buenos días", "hasta luego", "¿qué tal?"), None, "saludos-a1.pdf",
    ),
    _LessonSeed(
        "pierre@correo.com", -38, "Los colores y la ropa", "Describir la ropa que lleva",
        ("llevo", "una camiseta", "rojo", "los pantalones"),
        "Olvida la concordancia de género en los colores.", "colores-a1.pdf",
    ),
    _LessonSeed(
        "pierre@correo.com", -31, "La familia", "Presentar a los miembros de su familia",
        ("mi madre", "mi hermano", "se llama", "tiene"), None, "familia-a1.pdf",
    ),
    _LessonSeed(
        "pierre@correo.com", -24, "La comida", "Decir qué le gusta comer y beber",
        ("me gusta", "no me gusta", "el pan", "el agua"), None, "comida-a1.pdf",
    ),
    _LessonSeed(
        "pierre@correo.com", -10, "Los días de la semana", "Hablar de lo que hace cada día",
        ("el lunes", "el fin de semana", "todos los días", "hoy"),
        "Progresa rápido; repasar los artículos.", "dias-a1.pdf",
    ),
    _LessonSeed(
        "pierre@correo.com", 4, "En la ciudad", "Nombrar lugares de la ciudad",
        ("el banco", "la farmacia", "el parque", "hay un"), None, "ciudad-a1.pdf",
    ),
    _LessonSeed(
        "yuki@correo.com", -50, "El medio ambiente", "Debatir sobre el cambio climático y soluciones",
        ("habría que", "el reciclaje", "a largo plazo", "es fundamental que"), None, "medio-ambiente-b2.pdf",
    ),
    _LessonSeed(
        "yuki@correo.com", -40, "El mundo laboral", "Hablar del teletrabajo y la conciliación",
        ("teletrabajo", "conciliar", "a pesar de que", "en mi opinión"),
        "Muy fluida. Pulir los conectores concesivos.", "laboral-b2.pdf",
    ),
    _LessonSeed(
        "yuki@correo.com", -33, "Cine y literatura", "Reseñar una película o un libro",
        ("trata de", "el argumento", "me ha parecido", "lo recomiendo"), None, "cine-b2.pdf",
    ),
    _LessonSeed(
        "yuki@correo.com", -26, "Hipótesis y deseos", "Expresar hipótesis con el subjuntivo imperfecto",
        ("si pudiera", "ojalá", "me encantaría que", "en tu lugar"), None, "hipotesis-b2.pdf",
    ),
    _LessonSeed(
        "yuki@correo.com", -12, "Tecnología y sociedad", "Debatir sobre las redes sociales",
        ("las redes sociales", "por otro lado", "cabe destacar", "no obstante"),
        "Usa bien el registro formal.", "tecnologia-b2.pdf",
    ),
    _LessonSeed(
        "yuki@correo.com", 6, "Viajes y culturas", "Comparar costumbres de distintos países",
        ("me llamó la atención", "a diferencia de", "costumbre", "choque cultural"), None, "culturas-b2.pdf",
    ),
)


def seed(session: Session, *, password: str, now: datetime, files: FileStorage) -> bool:
    """Inserta los datos de prueba que falten y guarda un PDF de ejemplo por cada clase nueva.

    Devuelve False si ya existía todo (no hace nada).
    """
    created = _seed_users(session, password)
    users = {user.email: user for user in session.scalars(select(UserModel))}
    existing = set(session.execute(select(LessonModel.student_id, LessonModel.topic)).tuples())

    teacher_of = {student.email: student.teacher_email for student in STUDENTS}
    for lesson in LESSONS:
        student_user = users[lesson.student_email]
        if (student_user.id, lesson.topic) in existing:
            continue
        created = True
        _add_lesson(session, lesson, student_user, users[teacher_of[lesson.student_email]], now, files)
    session.flush()
    return created


def _seed_users(session: Session, password: str) -> bool:
    """Crea los docentes y estudiantes si no existen. Devuelve False si ya existían."""
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
    session.flush()
    return True


def _add_lesson(
    session: Session, lesson: _LessonSeed, student: UserModel, teacher: UserModel, now: datetime, files: FileStorage
) -> None:
    pdf_path = f"lessons/{student.public_id}/{lesson.pdf_filename}"
    files.write(
        pdf_path,
        build_sample_pdf(
            lesson.topic,
            [lesson.context, "", "Palabras clave:", *(f"- {keyword}" for keyword in lesson.keywords)],
        ),
    )
    session.add(
        LessonModel(
            student_id=student.id,
            teacher_id=teacher.id,
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
    print("Datos de prueba creados o completados. Contraseña de todos los usuarios: SEED_USER_PASSWORD en backend/.env")
    for person in TEACHERS:
        print(f"  docente     {person.email}")
    for student in STUDENTS:
        print(f"  estudiante  {student.email}  (docente: {student.teacher_email})")


if __name__ == "__main__":
    main()
