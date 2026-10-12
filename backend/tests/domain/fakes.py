"""Implementaciones en memoria de los puertos del dominio, para probar los casos de uso sin BD."""

from app.domain.entities import Level, Role, Student, User
from app.domain.ports import PasswordHasher, StudentRepository, UserRepository

FAKE_DUMMY_HASH = "hash-de-relleno"


class InMemoryUserRepository(UserRepository):
    def __init__(self, users: list[User] | None = None) -> None:
        self._users = {user.id: user for user in users or []}

    def get_by_id(self, user_id: int) -> User | None:
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
    user_id: int = 1,
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
    def __init__(self, students_by_teacher: dict[int, list[Student]] | None = None) -> None:
        self._students_by_teacher = students_by_teacher or {}

    def list_by_teacher(self, teacher_id: int) -> list[Student]:
        return list(self._students_by_teacher.get(teacher_id, []))


def make_student(
    *,
    student_id: int = 10,
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
