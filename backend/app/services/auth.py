from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.security import hash_password, verify_password

# Se verifica contra este hash cuando el correo no existe, para que la respuesta tarde lo mismo
# y no se pueda deducir qué correos están registrados.
_DUMMY_PASSWORD_HASH = hash_password("contraseña-de-relleno")


def authenticate(db: Session, email: str, password: str) -> User | None:
    """Devuelve el usuario si el correo y la contraseña son correctos; si no, None."""
    user = db.scalar(select(User).where(User.email == email.lower()))
    password_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
    if not verify_password(password, password_hash):
        return None
    return user
