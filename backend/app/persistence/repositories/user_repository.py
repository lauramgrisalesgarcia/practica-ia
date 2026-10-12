from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.entities import User
from app.domain.ports import UserRepository
from app.persistence.models import UserModel


class SqlAlchemyUserRepository(UserRepository):
    """Implementa `UserRepository` del dominio sobre PostgreSQL."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_by_id(self, user_id: int) -> User | None:
        model = self._session.get(UserModel, user_id)
        return _to_entity(model) if model else None

    def get_by_email(self, email: str) -> User | None:
        model = self._session.scalar(select(UserModel).where(UserModel.email == email))
        return _to_entity(model) if model else None


def _to_entity(model: UserModel) -> User:
    return User(
        id=model.id,
        first_name=model.first_name,
        last_name=model.last_name,
        email=model.email,
        password_hash=model.password_hash,
        role=model.role,
    )
