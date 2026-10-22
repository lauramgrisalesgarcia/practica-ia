from app.domain.entities import User
from app.domain.errors import InvalidCredentialsError, TooManyLoginAttemptsError
from app.domain.ports import LoginThrottle, PasswordHasher, UserRepository


class AuthenticateUser:
    def __init__(self, users: UserRepository, password_hasher: PasswordHasher, throttle: LoginThrottle) -> None:
        self._users = users
        self._password_hasher = password_hasher
        self._throttle = throttle

    def execute(self, email: str, password: str, origin: str) -> User:
        """`origin` identifica de dónde llega la petición (la IP del cliente)."""
        email = email.lower()
        # Por origen y correo: frena la fuerza bruta sin que otro origen pueda bloquear la cuenta
        throttle_key = f"{origin}|{email}"
        if self._throttle.is_blocked(throttle_key):
            raise TooManyLoginAttemptsError
        user = self._users.get_by_email(email)
        # Si el correo no existe se verifica igualmente contra un hash de relleno, para que la
        # respuesta tarde lo mismo y no se pueda deducir qué correos están registrados.
        password_hash = user.password_hash if user else self._password_hasher.dummy_hash
        if not self._password_hasher.verify(password, password_hash) or user is None:
            self._throttle.register_failure(throttle_key)
            raise InvalidCredentialsError
        self._throttle.reset(throttle_key)
        return user
