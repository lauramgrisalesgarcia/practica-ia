from sqlalchemy.orm import Session

from app.core.password_hasher import Argon2PasswordHasher
from app.domain.entities import Role
from app.persistence.models import UserModel

_hasher = Argon2PasswordHasher()


def create_user(
    session: Session,
    *,
    email: str = "docente@colegio.edu",
    password: str = "Docente#2026",
    role: Role = Role.DOCENTE,
    first_name: str = "María",
    last_name: str = "López",
) -> UserModel:
    user = UserModel(
        first_name=first_name,
        last_name=last_name,
        email=email.lower(),
        password_hash=_hasher.hash(password),
        role=role,
    )
    session.add(user)
    session.flush()
    return user
