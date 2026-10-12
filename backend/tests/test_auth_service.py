from sqlalchemy.orm import Session

from app.services.auth import authenticate
from tests.factories import create_user

PASSWORD = "Docente#2026"


def test_devuelve_el_usuario_si_las_credenciales_son_correctas(db_session: Session) -> None:
    user = create_user(db_session, email="docente@colegio.edu", password=PASSWORD)

    assert authenticate(db_session, "docente@colegio.edu", PASSWORD) == user


def test_el_correo_no_distingue_mayusculas(db_session: Session) -> None:
    user = create_user(db_session, email="docente@colegio.edu", password=PASSWORD)

    assert authenticate(db_session, "DOCENTE@colegio.edu", PASSWORD) == user


def test_devuelve_none_si_la_contraseña_es_incorrecta(db_session: Session) -> None:
    create_user(db_session, email="docente@colegio.edu", password=PASSWORD)

    assert authenticate(db_session, "docente@colegio.edu", "Otra#2026") is None


def test_devuelve_none_si_el_correo_no_existe(db_session: Session) -> None:
    assert authenticate(db_session, "nadie@colegio.edu", PASSWORD) is None
