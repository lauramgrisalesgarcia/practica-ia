import enum
from dataclasses import dataclass
from datetime import date, datetime
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
    pdf_filename: str
    keywords: tuple[str, ...]
    score: Decimal | None  # porcentaje de aciertos, o None si el material no está resuelto


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


@dataclass(frozen=True, slots=True)
class Answer:
    """Opción elegida por el estudiante para un ejercicio."""

    exercise_id: int
    selected_option: str


@dataclass(frozen=True, slots=True)
class ExerciseResult:
    exercise_id: int
    selected_option: str
    correct_option: str
    is_correct: bool


@dataclass(frozen=True, slots=True)
class Grade:
    """Corrección de un intento: se calcula siempre en el backend a partir del material y las respuestas."""

    results: tuple[ExerciseResult, ...]
    correct_count: int
    incorrect_count: int
    score: Decimal


@dataclass(frozen=True, slots=True)
class Submission:
    """Intento guardado del estudiante (uno por material)."""

    submitted_at: datetime
    answers: tuple[Answer, ...]
    correct_count: int
    incorrect_count: int
    score: Decimal
    feedback: str
    recommendations: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class StudentMaterialView:
    """Material de una clase tal como lo ve el estudiante, con su corrección si ya lo resolvió."""

    lesson_id: UUID
    material: Material
    submission: Submission | None
    grade: Grade | None


@dataclass(frozen=True, slots=True)
class LessonContext:
    """Contexto de una clase del estudiante, para pedir recomendaciones al LLM."""

    lesson_id: UUID
    topic: str
    context: str
    keywords: tuple[str, ...]
    student_level: Level
    native_language: str


@dataclass(frozen=True, slots=True)
class GradedSubmission:
    """Resultado de resolver un material: el intento guardado y su corrección."""

    lesson_id: UUID
    submission: Submission
    grade: Grade


@dataclass(frozen=True, slots=True)
class InsightLesson:
    """Clase realizada de un docente, con lo necesario para calcular sus indicadores."""

    id: UUID
    date: datetime
    student_name: str
    topic: str
    material_generated_at: datetime | None
    submitted_at: datetime | None
    score: Decimal | None


class InsightActivityType(enum.StrEnum):
    """Tipo de actividad reciente del panel del docente."""

    LESSON = "lesson"
    MATERIAL = "material"
    SUBMISSION = "submission"


@dataclass(frozen=True, slots=True)
class WeeklyCount:
    week_start: date  # lunes de la semana (UTC)
    count: int


@dataclass(frozen=True, slots=True)
class MaterialStatusCounts:
    completed: int
    pending: int
    none: int


@dataclass(frozen=True, slots=True)
class RecentActivity:
    type: InsightActivityType
    date: datetime
    lesson_id: UUID
    student_name: str
    topic: str
    score: Decimal | None  # solo en las entregas


@dataclass(frozen=True, slots=True)
class CalendarLesson:
    lesson_id: UUID
    start: datetime
    student_name: str
    topic: str


@dataclass(frozen=True, slots=True)
class TeacherInsights:
    lessons_this_month: int
    pending_materials: int
    material_status: MaterialStatusCounts
    weekly_lessons: tuple[WeeklyCount, ...]
    recent_activity: tuple[RecentActivity, ...]
    calendar: tuple[CalendarLesson, ...]
