import secrets
from typing import Any

from pydantic import SecretStr

from app.core.config import Settings

DATABASE_URL = "postgresql+psycopg://usuario:clave-de-bd@127.0.0.1:5433/base"


def make_settings(
    *, jwt_secret: str | None = None, gemini_api_key: str | None = None, gemini_model: str | None = None
) -> Settings:
    """Configuración para tests, sin leer ningún .env. Lo que no se indica toma su valor por defecto."""
    extra: dict[str, Any] = {}
    if gemini_api_key is not None:
        extra["gemini_api_key"] = SecretStr(gemini_api_key)
    if gemini_model is not None:
        extra["gemini_model"] = gemini_model
    return Settings(
        _env_file=None,
        database_url=SecretStr(DATABASE_URL),
        jwt_secret=SecretStr(jwt_secret or secrets.token_urlsafe(32)),
        **extra,
    )
