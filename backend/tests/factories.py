from sqlalchemy.orm import Session

from app.models import Role, User
from app.security import hash_password


def create_user(
    session: Session,
    *,
    email: str = "docente@colegio.edu",
    password: str = "Docente#2026",
    role: Role = Role.DOCENTE,
    first_name: str = "María",
    last_name: str = "López",
) -> User:
    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email.lower(),
        password_hash=hash_password(password),
        role=role,
    )
    session.add(user)
    session.flush()
    return user
