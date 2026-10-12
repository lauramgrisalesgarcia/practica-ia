"""Raíz de composición: crea las implementaciones concretas y las inyecta en los casos de uso.

Es el único lugar que conoce a la vez la persistencia y el dominio. La capa de transporte
solo pide casos de uso ya construidos.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.password_hasher import Argon2PasswordHasher
from app.domain.ports import UserRepository
from app.domain.use_cases.authenticate_user import AuthenticateUser
from app.domain.use_cases.get_user import GetUser
from app.persistence.database import get_session
from app.persistence.repositories.user_repository import SqlAlchemyUserRepository


def get_user_repository(session: Annotated[Session, Depends(get_session)]) -> UserRepository:
    return SqlAlchemyUserRepository(session)


def get_authenticate_user(users: Annotated[UserRepository, Depends(get_user_repository)]) -> AuthenticateUser:
    return AuthenticateUser(users=users, password_hasher=Argon2PasswordHasher())


def get_get_user(users: Annotated[UserRepository, Depends(get_user_repository)]) -> GetUser:
    return GetUser(users=users)
