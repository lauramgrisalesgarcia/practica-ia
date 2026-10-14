"""Interfaces que el dominio necesita y que implementan otras capas (inversión de dependencias)."""

from collections.abc import Mapping
from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from app.domain.entities import (
    GenerationContext,
    InsightLesson,
    LessonContext,
    LessonDetail,
    LessonPdfLocation,
    LessonSummary,
    Material,
    Student,
    Submission,
    User,
)


class UserRepository(Protocol):
    def get_by_id(self, user_id: UUID) -> User | None: ...

    def get_by_email(self, email: str) -> User | None:
        """Busca por correo exacto; quien llama lo normaliza a minúsculas."""
        ...


class PasswordHasher(Protocol):
    @property
    def dummy_hash(self) -> str:
        """Hash válido de una contraseña de relleno, para igualar tiempos de respuesta."""
        ...

    def verify(self, password: str, password_hash: str) -> bool: ...


class StudentRepository(Protocol):
    def list_by_teacher(self, teacher_id: UUID) -> list[Student]:
        """Estudiantes asignados al docente, ordenados por apellido y nombre."""
        ...

    def get_for_teacher(self, teacher_id: UUID, student_id: UUID) -> Student | None:
        """El estudiante, solo si está asignado a ese docente."""
        ...


class LessonRepository(Protocol):
    def count_completed_by_student(self, student_id: UUID, until: datetime) -> int:
        """Clases del estudiante con fecha anterior o igual a `until`."""
        ...

    def list_completed_by_student(self, student_id: UUID, until: datetime) -> list[LessonSummary]:
        """Clases del estudiante con fecha anterior o igual a `until`, de la más reciente a la más antigua."""
        ...

    def get_detail_for_teacher(self, teacher_id: UUID, lesson_id: UUID) -> LessonDetail | None:
        """Detalle de la clase, solo si es de un estudiante asignado a ese docente."""
        ...

    def get_pdf_for_teacher(self, teacher_id: UUID, lesson_id: UUID) -> LessonPdfLocation | None:
        """Ubicación del PDF de la clase, solo si es de un estudiante asignado a ese docente."""
        ...

    def get_context_for_student(self, student_id: UUID, lesson_id: UUID) -> LessonContext | None:
        """Contexto de la clase, solo si es de ese estudiante."""
        ...

    def exists_for_student(self, student_id: UUID, lesson_id: UUID) -> bool:
        """True si la clase existe y es de ese estudiante."""
        ...

    def get_pdf_for_student(self, student_id: UUID, lesson_id: UUID) -> LessonPdfLocation | None:
        """Ubicación del PDF de la clase, solo si es una clase de ese estudiante."""
        ...

    def get_generation_context_for_teacher(self, teacher_id: UUID, lesson_id: UUID) -> GenerationContext | None:
        """Datos para generar material, solo si la clase es de un estudiante asignado a ese docente."""
        ...


class TeacherInsightsRepository(Protocol):
    def list_completed_by_teacher(self, teacher_id: UUID, until: datetime) -> list[InsightLesson]:
        """Clases de los estudiantes del docente con fecha anterior o igual a `until`."""
        ...


class MaterialRepository(Protocol):
    def save(self, lesson_id: UUID, llm_request: Mapping[str, Any], material: Material) -> None:
        """Guarda el material de la clase (reemplaza el anterior) junto con la petición enviada al LLM."""
        ...

    def save_submission(self, lesson_id: UUID, student_id: UUID, submission: Submission) -> None:
        """Guarda el único intento del material. Si ya existe (incluso por envíos simultáneos),
        lanza SubmissionAlreadyExistsError."""
        ...

    def get_for_lesson(self, lesson_id: UUID) -> tuple[Material, Submission | None] | None:
        """Material de la clase y el intento del estudiante (si lo hay), o None si no hay material."""
        ...


class LLMClient(Protocol):
    def generate_material(self, request: Mapping[str, Any]) -> object:
        """Envía la petición al LLM y devuelve su respuesta JSON sin validar."""
        ...

    def generate_recommendations(self, request: Mapping[str, Any]) -> object:
        """Pide al LLM comentario y recomendaciones para un intento; respuesta JSON sin validar."""
        ...


class FileStorage(Protocol):
    def read(self, path: str) -> bytes | None:
        """Contenido del archivo, o None si no existe o la ruta no es válida."""
        ...

    def write(self, path: str, content: bytes) -> None:
        """Guarda el archivo. Lanza ValueError si la ruta no es válida."""
        ...


class Clock(Protocol):
    def now(self) -> datetime:
        """Momento actual, con zona horaria."""
        ...
