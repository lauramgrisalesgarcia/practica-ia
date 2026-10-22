from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración leída de variables de entorno o de `.env` (nunca versionado).

    Los secretos son `SecretStr`: no aparecen al imprimir la configuración ni en los errores.
    No tienen valor por defecto: si faltan, la aplicación no arranca.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: SecretStr
    jwt_secret: SecretStr = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    # Carpeta de archivos (PDF de las clases), relativa a backend/. No es un secreto.
    storage_dir: Path = Path("storage")
    # Clave de Google AI Studio. Opcional: sin ella se usa el LLM simulado.
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-3.8-flash"

    @field_validator("gemini_api_key", mode="before")
    @classmethod
    def _clave_vacia_no_configurada(cls, value: object) -> object:
        # Una clave vacía (p. ej. la plantilla .env.example) equivale a no tener clave
        texto = value.get_secret_value() if isinstance(value, SecretStr) else value
        return None if texto == "" else value


@lru_cache
def get_settings() -> Settings:
    return Settings()
