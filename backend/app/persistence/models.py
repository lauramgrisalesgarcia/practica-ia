from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.domain.entities import Level, Role


class Base(DeclarativeBase):
    pass


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
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
