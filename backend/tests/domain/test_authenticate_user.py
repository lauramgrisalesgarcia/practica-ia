import pytest

from app.domain.entities import User
from app.domain.errors import InvalidCredentialsError
from app.domain.use_cases.authenticate_user import AuthenticateUser
from tests.domain.fakes import FAKE_DUMMY_HASH, FakePasswordHasher, InMemoryUserRepository, make_user

PASSWORD = "Docente#2026"


def build(users: list[User] | None = None) -> tuple[AuthenticateUser, FakePasswordHasher]:
    hasher = FakePasswordHasher()
    return AuthenticateUser(users=InMemoryUserRepository(users), password_hasher=hasher), hasher


def test_devuelve_el_usuario_si_las_credenciales_son_correctas() -> None:
    user = make_user(password=PASSWORD)
    authenticate, _ = build([user])

    assert authenticate.execute("docente@colegio.edu", PASSWORD) == user


def test_el_correo_no_distingue_mayusculas() -> None:
    user = make_user(email="docente@colegio.edu", password=PASSWORD)
    authenticate, _ = build([user])

    assert authenticate.execute("Docente@COLEGIO.edu", PASSWORD) == user


def test_rechaza_una_contraseña_incorrecta() -> None:
    authenticate, _ = build([make_user(password=PASSWORD)])

    with pytest.raises(InvalidCredentialsError):
        authenticate.execute("docente@colegio.edu", "Otra#2026")


def test_rechaza_un_correo_inexistente() -> None:
    authenticate, _ = build()

    with pytest.raises(InvalidCredentialsError):
        authenticate.execute("nadie@colegio.edu", PASSWORD)


def test_con_un_correo_inexistente_verifica_igualmente_una_contraseña() -> None:
    """Evita que el tiempo de respuesta revele qué correos están registrados."""
    authenticate, hasher = build()

    with pytest.raises(InvalidCredentialsError):
        authenticate.execute("nadie@colegio.edu", PASSWORD)

    assert hasher.verified_hashes == [FAKE_DUMMY_HASH]
