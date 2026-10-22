import pytest

from app.domain.entities import User
from app.domain.errors import InvalidCredentialsError, TooManyLoginAttemptsError
from app.domain.use_cases.authenticate_user import AuthenticateUser
from tests.domain.fakes import (
    FAKE_DUMMY_HASH,
    FakeLoginThrottle,
    FakePasswordHasher,
    InMemoryUserRepository,
    make_user,
)

PASSWORD = "Docente#2026"
ORIGIN = "203.0.113.7"


def build(
    users: list[User] | None = None, throttle: FakeLoginThrottle | None = None
) -> tuple[AuthenticateUser, FakePasswordHasher]:
    hasher = FakePasswordHasher()
    authenticate = AuthenticateUser(
        users=InMemoryUserRepository(users), password_hasher=hasher, throttle=throttle or FakeLoginThrottle()
    )
    return authenticate, hasher


def test_devuelve_el_usuario_si_las_credenciales_son_correctas() -> None:
    user = make_user(password=PASSWORD)
    authenticate, _ = build([user])

    assert authenticate.execute("docente@colegio.edu", PASSWORD, ORIGIN) == user


def test_el_correo_no_distingue_mayusculas() -> None:
    user = make_user(email="docente@colegio.edu", password=PASSWORD)
    authenticate, _ = build([user])

    assert authenticate.execute("Docente@COLEGIO.edu", PASSWORD, ORIGIN) == user


def test_rechaza_una_contraseña_incorrecta() -> None:
    authenticate, _ = build([make_user(password=PASSWORD)])

    with pytest.raises(InvalidCredentialsError):
        authenticate.execute("docente@colegio.edu", "Otra#2026", ORIGIN)


def test_rechaza_un_correo_inexistente() -> None:
    authenticate, _ = build()

    with pytest.raises(InvalidCredentialsError):
        authenticate.execute("nadie@colegio.edu", PASSWORD, ORIGIN)


def test_con_un_correo_inexistente_verifica_igualmente_una_contraseña() -> None:
    """Evita que el tiempo de respuesta revele qué correos están registrados."""
    authenticate, hasher = build()

    with pytest.raises(InvalidCredentialsError):
        authenticate.execute("nadie@colegio.edu", PASSWORD, ORIGIN)

    assert hasher.verified_hashes == [FAKE_DUMMY_HASH]


def test_con_demasiados_intentos_fallidos_rechaza_incluso_la_contraseña_correcta() -> None:
    authenticate, _ = build([make_user(password=PASSWORD)], FakeLoginThrottle(blocked=True))

    with pytest.raises(TooManyLoginAttemptsError):
        authenticate.execute("docente@colegio.edu", PASSWORD, ORIGIN)


def test_un_intento_fallido_se_registra_por_origen_y_correo_sin_mayusculas() -> None:
    throttle = FakeLoginThrottle()
    authenticate, _ = build([make_user(password=PASSWORD)], throttle)

    with pytest.raises(InvalidCredentialsError):
        authenticate.execute("Docente@COLEGIO.edu", "Otra#2026", ORIGIN)

    assert throttle.failures == [f"{ORIGIN}|docente@colegio.edu"]


def test_un_inicio_de_sesion_correcto_reinicia_los_intentos_fallidos() -> None:
    throttle = FakeLoginThrottle()
    authenticate, _ = build([make_user(password=PASSWORD)], throttle)

    authenticate.execute("docente@colegio.edu", PASSWORD, ORIGIN)

    assert throttle.resets == [f"{ORIGIN}|docente@colegio.edu"]
    assert throttle.failures == []
