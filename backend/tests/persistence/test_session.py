"""La sesión real de la aplicación (`get_session`) confirma los cambios de una petición correcta
y los descarta si la petición falla. Estos tests no usan la sesión transaccional de `db_session`."""

from collections.abc import Iterator
from uuid import uuid4

import pytest
from sqlalchemy import delete, select

from app.domain.entities import Role
from app.persistence.database import SessionLocal, get_session
from app.persistence.models import UserModel


@pytest.fixture
def email() -> Iterator[str]:
    address = f"sesion-{uuid4()}@colegio.edu"
    yield address
    with SessionLocal() as cleanup:
        cleanup.execute(delete(UserModel).where(UserModel.email == address))
        cleanup.commit()


def add_user(email: str) -> UserModel:
    return UserModel(first_name="Prueba", last_name="Sesión", email=email, password_hash="x", role=Role.DOCENTE)


def exists(email: str) -> bool:
    with SessionLocal() as session:
        return session.scalar(select(UserModel.id).where(UserModel.email == email)) is not None


def test_confirma_los_cambios_al_terminar_la_peticion(email: str) -> None:
    sessions = get_session()
    session = next(sessions)
    session.add(add_user(email))

    with pytest.raises(StopIteration):
        next(sessions)

    assert exists(email)


def test_descarta_los_cambios_si_la_peticion_falla(email: str) -> None:
    sessions = get_session()
    session = next(sessions)
    session.add(add_user(email))
    session.flush()

    with pytest.raises(RuntimeError):
        sessions.throw(RuntimeError("fallo en la petición"))

    assert not exists(email)
