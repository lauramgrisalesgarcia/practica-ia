import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Index, Numeric, String, Text, Uuid, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.domain.entities import Level, Role


class Base(DeclarativeBase):
    pass


def public_id_column() -> Mapped[uuid.UUID]:
    """Identificador público: UUID v4 aleatorio. Es el único id que sale de la persistencia;
    el `id` numérico solo se usa internamente para relacionar tablas."""
    return mapped_column(Uuid, unique=True, default=uuid.uuid4, server_default=text("gen_random_uuid()"))


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[uuid.UUID] = public_id_column()
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(
        Enum(Role, name="user_role", values_callable=lambda roles: [r.value for r in roles])
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StudentProfileModel(Base):
    """Datos propios de los usuarios con rol estudiante."""

    __tablename__ = "student_profiles"
    __table_args__ = (
        CheckConstraint("native_language ~ '^[a-z]{2}$'", name="native_language_iso_639_1"),
    )

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    native_language: Mapped[str] = mapped_column(String(2))
    level: Mapped[Level] = mapped_column(
        Enum(Level, name="student_level", values_callable=lambda levels: [lv.value for lv in levels])
    )


class LessonModel(Base):
    """Clase tomada por un estudiante con su docente."""

    __tablename__ = "lessons"
    __table_args__ = (
        CheckConstraint("duration_minutes > 0", name="duration_minutes_positive"),
        CheckConstraint("cardinality(keywords) >= 1", name="keywords_not_empty"),
        Index("ix_lessons_student_id_date", "student_id", "date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[uuid.UUID] = public_id_column()
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[int]
    topic: Mapped[str] = mapped_column(String(200))
    context: Mapped[str] = mapped_column(Text)
    keywords: Mapped[list[str]] = mapped_column(ARRAY(String(50)))
    notes: Mapped[str | None] = mapped_column(Text)
    pdf_filename: Mapped[str] = mapped_column(String(255))
    pdf_path: Mapped[str] = mapped_column(String(500))


class ReinforcementMaterialModel(Base):
    """Material de refuerzo generado para una clase (como máximo uno vigente por clase)."""

    __tablename__ = "reinforcement_materials"
    __table_args__ = (
        CheckConstraint("exercise_count BETWEEN 1 AND 15", name="exercise_count_range"),
        CheckConstraint("activity_type IN ('complete_sentence')", name="activity_type_supported"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[uuid.UUID] = public_id_column()
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), unique=True)
    activity_type: Mapped[str] = mapped_column(String(50))
    exercise_count: Mapped[int]
    llm_request: Mapped[dict[str, Any]] = mapped_column(JSONB)
    content: Mapped[dict[str, Any]] = mapped_column(JSONB)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MaterialSubmissionModel(Base):
    """Único intento de resolución de un material por parte del estudiante."""

    __tablename__ = "material_submissions"
    __table_args__ = (
        CheckConstraint("correct_count >= 0 AND incorrect_count >= 0", name="counts_not_negative"),
        CheckConstraint("score BETWEEN 0 AND 100", name="score_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    public_id: Mapped[uuid.UUID] = public_id_column()
    # unique: garantiza un único intento por material aunque lleguen dos envíos a la vez.
    material_id: Mapped[int] = mapped_column(
        ForeignKey("reinforcement_materials.id", ondelete="CASCADE"), unique=True
    )
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    answers: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    correct_count: Mapped[int]
    incorrect_count: Mapped[int]
    score: Mapped[Decimal] = mapped_column(Numeric(5, 2))
    recommendations: Mapped[dict[str, Any]] = mapped_column(JSONB)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
