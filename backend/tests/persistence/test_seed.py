from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.password_hasher import Argon2PasswordHasher
from app.domain.entities import Role
from app.persistence.file_storage import LocalFileStorage
from app.persistence.models import LessonModel, StudentProfileModel, UserModel
from app.persistence.seed import seed

PASSWORD = "contraseña-de-prueba-del-seed"
NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def count(session: Session, model: type[object]) -> int:
    return session.scalar(select(func.count()).select_from(model)) or 0


def test_crea_docentes_estudiantes_y_clases(db_session: Session, tmp_path: Path) -> None:
    seed(db_session, password=PASSWORD, now=NOW, files=LocalFileStorage(tmp_path))

    roles = db_session.scalars(select(UserModel.role)).all()
    assert roles.count(Role.DOCENTE) == 2
    assert roles.count(Role.ESTUDIANTE) == 4
    assert count(db_session, StudentProfileModel) == 4
    assert count(db_session, LessonModel) > 0


def test_hay_clases_pasadas_y_al_menos_una_futura(db_session: Session, tmp_path: Path) -> None:
    seed(db_session, password=PASSWORD, now=NOW, files=LocalFileStorage(tmp_path))

    dates = db_session.scalars(select(LessonModel.date)).all()
    assert any(date <= NOW for date in dates)
    assert any(date > NOW for date in dates)


def test_todos_los_usuarios_usan_la_contraseña_indicada(db_session: Session, tmp_path: Path) -> None:
    seed(db_session, password=PASSWORD, now=NOW, files=LocalFileStorage(tmp_path))

    hasher = Argon2PasswordHasher()
    hashes = db_session.scalars(select(UserModel.password_hash)).all()
    assert all(hasher.verify(PASSWORD, password_hash) for password_hash in hashes)


def test_es_idempotente(db_session: Session, tmp_path: Path) -> None:
    seed(db_session, password=PASSWORD, now=NOW, files=LocalFileStorage(tmp_path))
    users_before = count(db_session, UserModel)
    lessons_before = count(db_session, LessonModel)

    seed(db_session, password=PASSWORD, now=NOW, files=LocalFileStorage(tmp_path))

    assert count(db_session, UserModel) == users_before
    assert count(db_session, LessonModel) == lessons_before


def test_genera_un_pdf_valido_para_cada_clase(db_session: Session, tmp_path: Path) -> None:
    files = LocalFileStorage(tmp_path)
    seed(db_session, password=PASSWORD, now=NOW, files=files)

    paths = db_session.scalars(select(LessonModel.pdf_path)).all()
    contents = [files.read(path) for path in paths]
    assert all(content is not None and content.startswith(b"%PDF-") for content in contents)


def test_cada_estudiante_tiene_muchas_clases_pasadas_y_alguna_futura(db_session: Session, tmp_path: Path) -> None:
    seed(db_session, password=PASSWORD, now=NOW, files=LocalFileStorage(tmp_path))

    for student_id in db_session.scalars(select(StudentProfileModel.user_id)).all():
        dates = db_session.scalars(select(LessonModel.date).where(LessonModel.student_id == student_id)).all()
        assert sum(date <= NOW for date in dates) >= 6
        assert sum(date > NOW for date in dates) >= 1


def test_volver_a_ejecutarlo_añade_las_clases_que_faltan_sin_duplicar(db_session: Session, tmp_path: Path) -> None:
    files = LocalFileStorage(tmp_path)
    seed(db_session, password=PASSWORD, now=NOW, files=files)
    lessons_before = count(db_session, LessonModel)
    missing = db_session.scalars(select(LessonModel)).first()
    assert missing is not None
    db_session.delete(missing)
    db_session.flush()

    seed(db_session, password=PASSWORD, now=NOW, files=files)

    assert count(db_session, LessonModel) == lessons_before
    assert count(db_session, UserModel) == 6
