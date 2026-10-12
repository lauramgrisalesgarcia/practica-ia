from app.domain.entities import User
from app.domain.errors import InvalidCredentialsError
from app.domain.ports import PasswordHasher, UserRepository


class AuthenticateUser:
    def __init__(self, users: UserRepository, password_hasher: PasswordHasher) -> None:
        self._users = users
        self._password_hasher = password_hasher

    def execute(self, email: str, password: str) -> User:
        user = self._users.get_by_email(email.lower())
        # Si el correo no existe se verifica igualmente contra un hash de relleno, para que la
        # respuesta tarde lo mismo y no se pueda deducir qué correos están registrados.
        password_hash = user.password_hash if user else self._password_hasher.dummy_hash
        if not self._password_hasher.verify(password, password_hash) or user is None:
            raise InvalidCredentialsError
        return user
