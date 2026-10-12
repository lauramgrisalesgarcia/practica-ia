"""Interfaces que el dominio necesita y que implementan otras capas (inversión de dependencias)."""

from datetime import datetime
from typing import Protocol

from app.domain.entities import Student, User


class UserRepository(Protocol):
    def get_by_id(self, user_id: int) -> User | None: ...

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
    def list_by_teacher(self, teacher_id: int) -> list[Student]:
        """Estudiantes asignados al docente, ordenados por apellido y nombre."""
        ...

    def get_for_teacher(self, teacher_id: int, student_id: int) -> Student | None:
        """El estudiante, solo si está asignado a ese docente."""
        ...


class LessonRepository(Protocol):
    def count_completed_by_student(self, student_id: int, until: datetime) -> int:
        """Clases del estudiante con fecha anterior o igual a `until`."""
        ...


class Clock(Protocol):
    def now(self) -> datetime:
        """Momento actual, con zona horaria."""
        ...
