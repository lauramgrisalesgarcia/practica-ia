"""Implementaciones en memoria de los puertos del dominio, para probar los casos de uso sin BD."""

from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from app.domain.entities import (
    GenerationContext,
    LessonContext,
    LessonDetail,
    LessonPdfLocation,
    LessonSummary,
    Level,
    Material,
    MaterialStatus,
    Submission,
    Role,
    Student,
    User,
)
from app.domain.errors import SubmissionAlreadyExistsError
from app.domain.ports import (
    Clock,
    FileStorage,
    LessonRepository,
    LLMClient,
    MaterialRepository,
    PasswordHasher,
    StudentRepository,
    UserRepository,
)

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
    """Guarda pares (id del estudiante, clase)."""

    def __init__(
        self,
        lessons: list[tuple[UUID, LessonSummary]] | None = None,
        details_by_teacher: dict[UUID, list[LessonDetail]] | None = None,
        pdfs_by_teacher: dict[UUID, dict[UUID, tuple[str, str]]] | None = None,
        contexts_by_teacher: dict[UUID, list[GenerationContext]] | None = None,
        pdfs_by_student: dict[UUID, dict[UUID, tuple[str, str]]] | None = None,
        lessons_by_student: dict[UUID, set[UUID]] | None = None,
        student_contexts: dict[UUID, list[LessonContext]] | None = None,
    ) -> None:
        self._student_contexts = student_contexts or {}
        self._lessons_by_student = lessons_by_student or {}
        self._pdfs_by_student = pdfs_by_student or {}
        self._contexts_by_teacher = contexts_by_teacher or {}
        self._lessons = lessons or []
        self._details_by_teacher = details_by_teacher or {}
        self._pdfs_by_teacher = pdfs_by_teacher or {}

    def _completed(self, student_id: UUID, until: datetime) -> list[LessonSummary]:
        return [lesson for owner, lesson in self._lessons if owner == student_id and lesson.date <= until]

    def count_completed_by_student(self, student_id: UUID, until: datetime) -> int:
        return len(self._completed(student_id, until))

    def list_completed_by_student(self, student_id: UUID, until: datetime) -> list[LessonSummary]:
        return sorted(self._completed(student_id, until), key=lambda lesson: lesson.date, reverse=True)

    def get_detail_for_teacher(self, teacher_id: UUID, lesson_id: UUID) -> LessonDetail | None:
        return next((d for d in self._details_by_teacher.get(teacher_id, []) if d.summary.id == lesson_id), None)

    def get_pdf_for_teacher(self, teacher_id: UUID, lesson_id: UUID) -> LessonPdfLocation | None:
        location = self._pdfs_by_teacher.get(teacher_id, {}).get(lesson_id)
        return LessonPdfLocation(*location) if location else None

    def get_context_for_student(self, student_id: UUID, lesson_id: UUID) -> LessonContext | None:
        return next((c for c in self._student_contexts.get(student_id, []) if c.lesson_id == lesson_id), None)

    def exists_for_student(self, student_id: UUID, lesson_id: UUID) -> bool:
        return lesson_id in self._lessons_by_student.get(student_id, set())

    def get_pdf_for_student(self, student_id: UUID, lesson_id: UUID) -> LessonPdfLocation | None:
        location = self._pdfs_by_student.get(student_id, {}).get(lesson_id)
        return LessonPdfLocation(*location) if location else None

    def get_generation_context_for_teacher(self, teacher_id: UUID, lesson_id: UUID) -> GenerationContext | None:
        return next((c for c in self._contexts_by_teacher.get(teacher_id, []) if c.lesson_id == lesson_id), None)


class InMemoryMaterialRepository(MaterialRepository):
    """Guarda por clase el último material y la petición enviada al LLM."""

    def __init__(self) -> None:
        self.saved: dict[UUID, tuple[dict[str, Any], Material]] = {}
        self.submissions: dict[UUID, Submission] = {}

    def save(self, lesson_id: UUID, llm_request: Mapping[str, Any], material: Material) -> None:
        self.saved[lesson_id] = (dict(llm_request), material)

    def save_submission(self, lesson_id: UUID, student_id: UUID, submission: Submission) -> None:
        # Igual que la restricción única de la BD: un solo intento por material.
        if lesson_id in self.submissions:
            raise SubmissionAlreadyExistsError
        self.submissions[lesson_id] = submission

    def get_for_lesson(self, lesson_id: UUID) -> tuple[Material, Submission | None] | None:
        if lesson_id not in self.saved:
            return None
        return self.saved[lesson_id][1], self.submissions.get(lesson_id)


class FakeLLMClient(LLMClient):
    """Devuelve la respuesta indicada (o lanza el error indicado) y registra las peticiones."""

    def __init__(self, response: object = None, error: Exception | None = None) -> None:
        self._response = response
        self._error = error
        self.requests: list[dict[str, Any]] = []

    def generate_material(self, request: Mapping[str, Any]) -> object:
        return self._respond(request)

    def generate_recommendations(self, request: Mapping[str, Any]) -> object:
        return self._respond(request)

    def _respond(self, request: Mapping[str, Any]) -> object:
        self.requests.append(dict(request))
        if self._error is not None:
            raise self._error
        return self._response


class InMemoryFileStorage(FileStorage):
    def __init__(self, files: dict[str, bytes] | None = None) -> None:
        self.files = dict(files or {})

    def read(self, path: str) -> bytes | None:
        return self.files.get(path)

    def write(self, path: str, content: bytes) -> None:
        self.files[path] = content


def make_lesson(
    *,
    date: datetime,
    lesson_id: UUID | None = None,
    topic: str = "Pedir en un restaurante",
    material_status: MaterialStatus = MaterialStatus.NONE,
    pdf_filename: str = "restaurante-a2.pdf",
) -> LessonSummary:
    return LessonSummary(
        id=lesson_id or uuid4(),
        date=date,
        duration_minutes=60,
        topic=topic,
        context="Pedir comida y bebida en un restaurante y pedir la cuenta",
        material_status=material_status,
        pdf_filename=pdf_filename,
    )


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


def make_lesson_detail(*, student: Student, date: datetime, lesson_id: UUID | None = None) -> LessonDetail:
    return LessonDetail(
        summary=make_lesson(date=date, lesson_id=lesson_id),
        keywords=("la carta", "quisiera"),
        notes=None,
        student=student,
        material=None,
        submission=None,
    )
