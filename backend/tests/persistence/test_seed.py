from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.password_hasher import Argon2PasswordHasher
from app.domain.entities import Role
from app.persistence.models import LessonModel, StudentProfileModel, UserModel
from app.persistence.seed import seed

PASSWORD = "contraseña-de-prueba-del-seed"
NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def count(session: Session, model: type[object]) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


def test_crea_docentes_estudiantes_y_clases(db_session: Session) -> None:
    seed(db_session, password=PASSWORD, now=NOW)

    roles = db_session.scalars(select(UserModel.role)).all()
    assert roles.count(Role.DOCENTE) == 2
    assert roles.count(Role.ESTUDIANTE) == 4
    assert count(db_session, StudentProfileModel) == 4
    assert count(db_session, LessonModel) > 0


def test_hay_clases_pasadas_y_al_menos_una_futura(db_session: Session) -> None:
    seed(db_session, password=PASSWORD, now=NOW)

    dates = db_session.scalars(select(LessonModel.date)).all()
    assert any(date <= NOW for date in dates)
    assert any(date > NOW for date in dates)


def test_todos_los_usuarios_usan_la_contraseña_indicada(db_session: Session) -> None:
    seed(db_session, password=PASSWORD, now=NOW)

    hasher = Argon2PasswordHasher()
    hashes = db_session.scalars(select(UserModel.password_hash)).all()
    assert all(hasher.verify(PASSWORD, password_hash) for password_hash in hashes)


def test_es_idempotente(db_session: Session) -> None:
    seed(db_session, password=PASSWORD, now=NOW)
    users_before = count(db_session, UserModel)
    lessons_before = count(db_session, LessonModel)

    seed(db_session, password=PASSWORD, now=NOW)

    assert count(db_session, UserModel) == users_before
    assert count(db_session, LessonModel) == lessons_before
