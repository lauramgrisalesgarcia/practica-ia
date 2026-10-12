"""Reglas de acceso del dominio, reutilizadas por los use cases."""

from uuid import UUID

from app.domain.entities import Role, Student, User
from app.domain.errors import AccessDeniedError, StudentNotFoundError
from app.domain.ports import StudentRepository


def require_teacher(user: User) -> None:
    if user.role is not Role.DOCENTE:
        raise AccessDeniedError


def require_own_student(teacher: User, student_id: UUID, students: StudentRepository) -> Student:
    """El estudiante, si es del docente. Si no existe o es de otro docente: StudentNotFoundError
    (no se distingue, para no revelar qué estudiantes existen)."""
    require_teacher(teacher)
    student = students.get_for_teacher(teacher.id, student_id)
    if student is None:
        raise StudentNotFoundError
    return student
