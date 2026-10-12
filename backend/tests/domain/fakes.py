"""Implementaciones en memoria de los puertos del dominio, para probar los casos de uso sin BD."""

from datetime import UTC, datetime
from uuid import UUID

from app.domain.entities import Level, Role, Student, User
from app.domain.ports import Clock, LessonRepository, PasswordHasher, StudentRepository, UserRepository

FAKE_DUMMY_HASH = "hash-de-relleno"


def uid(n: int) -> UUID:
    """UUID fijo y legible para los tests (uid(1) == 00000000-0000-0000-0000-000000000001)."""
    return UUID(int=n)


class InMemoryUserRepository(UserRepository):
    def __init__(self, users: list[User] | None = None) -> None:
        self._users = {user.id: user for user in users or []}

    def get_by_id(self, user_id: UUID) -> User | None:
        return self._users.get(user_id)

    def get_by_email(self, email: str) -> User | None:
        return next((u for u in self._users.values() if u.email == email), None)


class FakePasswordHasher(PasswordHasher):
    """Simula un hasher: el hash de "x" es "hash:x". Registra las verificaciones."""

    dummy_hash = FAKE_DUMMY_HASH

    def __init__(self) -> None:
        self.verified_hashes: list[str] = []

    def hash(self, password: str) -> str:
        return f"hash:{password}"

    def verify(self, password: str, password_hash: str) -> bool:
        self.verified_hashes.append(password_hash)
        return password_hash == self.hash(password)


def make_user(
    *,
    user_id: UUID = UUID(int=1),
    email: str = "docente@colegio.edu",
    password: str = "Docente#2026",
    role: Role = Role.DOCENTE,
) -> User:
    return User(
        id=user_id,
        first_name="María",
        last_name="López",
        email=email,
        password_hash=FakePasswordHasher().hash(password),
        role=role,
    )


class InMemoryStudentRepository(StudentRepository):
    def __init__(self, students_by_teacher: dict[UUID, list[Student]] | None = None) -> None:
        self._students_by_teacher = students_by_teacher or {}

    def list_by_teacher(self, teacher_id: UUID) -> list[Student]:
        return list(self._students_by_teacher.get(teacher_id, []))

    def get_for_teacher(self, teacher_id: UUID, student_id: UUID) -> Student | None:
        return next((s for s in self._students_by_teacher.get(teacher_id, []) if s.id == student_id), None)


class InMemoryLessonRepository(LessonRepository):
    """Guarda solo lo necesario para contar: (id del estudiante, fecha de la clase)."""

    def __init__(self, lessons: list[tuple[UUID, datetime]] | None = None) -> None:
        self._lessons = lessons or []

    def count_completed_by_student(self, student_id: UUID, until: datetime) -> int:
        return sum(1 for owner, date in self._lessons if owner == student_id and date <= until)


class FixedClock(Clock):
    def __init__(self, now: datetime = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)) -> None:
        self._now = now

    def now(self) -> datetime:
        return self._now


def make_student(
    *,
    student_id: UUID = UUID(int=10),
    first_name: str = "Emma",
    last_name: str = "Schmidt",
    email: str = "emma@correo.com",
    native_language: str = "de",
    level: Level = Level.A2,
) -> Student:
    return Student(
        id=student_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        native_language=native_language,
        level=level,
    )
