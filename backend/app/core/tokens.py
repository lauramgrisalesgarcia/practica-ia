from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt

from app.core.config import get_settings


class InvalidTokenError(Exception):
    """El token no es válido, está caducado o no identifica a un usuario."""


def create_access_token(user_id: UUID, expires_delta: timedelta | None = None) -> str:
    settings = get_settings()
    expires_delta = expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": datetime.now(UTC) + expires_delta}
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> UUID:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=[settings.jwt_algorithm])
        return UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError) as error:
        raise InvalidTokenError from error
