from app.domain.use_cases.get_user import GetUser
from tests.domain.fakes import InMemoryUserRepository, make_user, uid


def test_devuelve_el_usuario_por_su_id() -> None:
    user = make_user(user_id=uid(7))

    assert GetUser(users=InMemoryUserRepository([user])).execute(uid(7)) == user


def test_devuelve_none_si_el_usuario_no_existe() -> None:
    assert GetUser(users=InMemoryUserRepository()).execute(uid(7)) is None
