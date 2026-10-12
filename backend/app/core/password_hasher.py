from pwdlib import PasswordHash

_password_hash = PasswordHash.recommended()
# Se calcula una sola vez: hashear con argon2 es costoso a propósito.
_DUMMY_HASH = _password_hash.hash("contraseña-de-relleno")


class Argon2PasswordHasher:
    """Implementa `PasswordHasher` del dominio con argon2."""

    @property
    def dummy_hash(self) -> str:
        return _DUMMY_HASH

    def hash(self, password: str) -> str:
        return _password_hash.hash(password)

    def verify(self, password: str, password_hash: str) -> bool:
        return _password_hash.verify(password, password_hash)
