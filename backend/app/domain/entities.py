import enum
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any, NamedTuple
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


class ActivityType(enum.StrEnum):
    """Tipo de actividad del material. En el alcance del proyecto solo existe completar frases."""

    COMPLETE_SENTENCE = "complete_sentence"


@dataclass(frozen=True, slots=True)
class Exercise:
    """Ejercicio de completar la frase: `sentence` contiene un hueco `___`."""

    id: int
    sentence: str
    options: tuple[str, ...]
    correct_option: str


@dataclass(frozen=True, slots=True)
class Material:
    generated_at: datetime
    activity_type: ActivityType
    exercise_count: int
    title: str
    instructions: str
    exercises: tuple[Exercise, ...]


@dataclass(frozen=True, slots=True)
class SubmissionSummary:
    submitted_at: datetime
    correct_count: int
    incorrect_count: int
    score: Decimal


@dataclass(frozen=True, slots=True)
class LessonDetail:
    summary: LessonSummary
    keywords: tuple[str, ...]
    notes: str | None
    pdf_filename: str
    student: Student
    material: Material | None
    submission: SubmissionSummary | None


class LessonPdfLocation(NamedTuple):
    """Dónde está guardado el PDF de una clase. La ruta nunca se expone fuera del backend."""

    filename: str
    path: str


@dataclass(frozen=True, slots=True)
class LessonFile:
    filename: str
    content: bytes


@dataclass(frozen=True, slots=True)
class GenerationContext:
    """Datos de una clase necesarios para generar su material de refuerzo."""

    lesson_id: UUID
    date: datetime
    topic: str
    context: str
    keywords: tuple[str, ...]
    notes: str | None
    pdf_filename: str
    pdf_path: str
    student_level: Level
    native_language: str
    has_submission: bool


@dataclass(frozen=True, slots=True)
class MaterialGenerationRequest:
    """Lo que se pide al LLM para generar el material de refuerzo de una clase."""

    activity_type: ActivityType
    exercise_count: int
    student_level: Level
    native_language: str
    topic: str
    context: str
    keywords: tuple[str, ...]
    notes: str | None
    pdf_filename: str
    pdf_path: str

    def to_llm_payload(self) -> dict[str, Any]:
        """Petición al LLM en el formato definido en los requerimientos (docs/001-backend-requirements.md)."""
        return {
            "task": "generate_reinforcement_material",
            "activity_type": self.activity_type.value,
            "exercise_count": self.exercise_count,
            "student": {"level": self.student_level.value, "native_language": self.native_language},
            "lesson": {
                "topic": self.topic,
                "context": self.context,
                "keywords": list(self.keywords),
                "notes": self.notes,
                "pdf": {"filename": self.pdf_filename, "path": self.pdf_path},
            },
            "output_language": "es",
        }
