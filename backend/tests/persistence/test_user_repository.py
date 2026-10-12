from sqlalchemy.orm import Session

from app.domain.entities import Role, User
from app.persistence.repositories.user_repository import SqlAlchemyUserRepository
from tests.factories import create_user


def test_busca_por_correo_y_devuelve_una_entidad_del_dominio(db_session: Session) -> None:
    model = create_user(
        db_session, email="emma@correo.com", role=Role.ESTUDIANTE, first_name="Emma", last_name="Schmidt"
    )

    user = SqlAlchemyUserRepository(db_session).get_by_email("emma@correo.com")

    assert user == User(
        id=model.id,
        first_name="Emma",
        last_name="Schmidt",
        email="emma@correo.com",
        password_hash=model.password_hash,
        role=Role.ESTUDIANTE,
    )


def test_busca_por_id(db_session: Session) -> None:
    model = create_user(db_session)

    user = SqlAlchemyUserRepository(db_session).get_by_id(model.id)

    assert user is not None
    assert user.email == model.email


def test_devuelve_none_si_no_existe(db_session: Session) -> None:
    repository = SqlAlchemyUserRepository(db_session)

    assert repository.get_by_email("nadie@colegio.edu") is None
    assert repository.get_by_id(999_999) is None
