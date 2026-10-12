import enum
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


class Role(enum.StrEnum):
    DOCENTE = "docente"
    ESTUDIANTE = "estudiante"


class MaterialStatus(enum.StrEnum):
    """Estado del material de refuerzo de una clase."""

    NONE = "none"  # sin material
    PENDING = "pending"  # generado, sin resolver
    COMPLETED = "completed"  # resuelto por el estudiante


class Level(enum.StrEnum):
    """Nivel del Marco Común Europeo de Referencia (MCER)."""

    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


@dataclass(frozen=True, slots=True)
class User:
    id: UUID
    first_name: str
    last_name: str
    email: str
    password_hash: str
    role: Role


@dataclass(frozen=True, slots=True)
class Student:
    id: UUID
    first_name: str
    last_name: str
    email: str
    native_language: str
    level: Level


@dataclass(frozen=True, slots=True)
class StudentDetail:
    student: Student
    lessons_count: int


@dataclass(frozen=True, slots=True)
class LessonSummary:
    id: UUID
    date: datetime
    duration_minutes: int
    topic: str
    context: str
    material_status: MaterialStatus
