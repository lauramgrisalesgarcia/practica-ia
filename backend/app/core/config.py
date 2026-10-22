from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# gemini-3.8-flash tarda más de un minuto en generar 7 ejercicios (piensa mucho); este responde en segundos
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash"
# Respaldo si el principal está saturado, sin cuota o tarda demasiado: los flash-lite tienen mucha menos demanda
DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite"


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
    gemini_model: str = DEFAULT_GEMINI_MODEL
    gemini_fallback_model: str = DEFAULT_GEMINI_FALLBACK_MODEL

    @field_validator("gemini_model", mode="before")
    @classmethod
    def _modelo_vacio_por_defecto(cls, value: object) -> object:
        # Un modelo vacío dejaría la URL de Gemini rota: se usa el de por defecto
        return DEFAULT_GEMINI_MODEL if value == "" else value

    @field_validator("gemini_fallback_model", mode="before")
    @classmethod
    def _respaldo_vacio_por_defecto(cls, value: object) -> object:
        return DEFAULT_GEMINI_FALLBACK_MODEL if value == "" else value

    @field_validator("gemini_api_key", mode="before")
    @classmethod
    def _clave_vacia_no_configurada(cls, value: object) -> object:
        # Una clave vacía (p. ej. la plantilla .env.example) equivale a no tener clave
        texto = value.get_secret_value() if isinstance(value, SecretStr) else value
        return None if texto == "" else value


@lru_cache
def get_settings() -> Settings:
    return Settings()
