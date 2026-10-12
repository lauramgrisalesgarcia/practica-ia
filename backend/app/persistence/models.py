import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Index, String, Text, Uuid, func, text
from sqlalchemy.dialects.postgresql import ARRAY
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
