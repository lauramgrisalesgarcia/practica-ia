import secrets

from pydantic import SecretStr

from app.composition import build_llm_client
from app.core.config import Settings
from app.llm.gemini import GeminiLLMClient
from app.llm.simulated import SimulatedLLMClient

DATABASE_URL = "postgresql+psycopg://usuario:clave-de-bd@127.0.0.1:5433/base"


def make_settings(*, gemini_api_key: str | None) -> Settings:
    return Settings(
        _env_file=None,
        database_url=SecretStr(DATABASE_URL),
        jwt_secret=SecretStr(secrets.token_urlsafe(32)),
        gemini_api_key=SecretStr(gemini_api_key) if gemini_api_key is not None else None,
    )


def test_sin_clave_de_gemini_usa_el_llm_simulado() -> None:
    assert isinstance(build_llm_client(make_settings(gemini_api_key=None)), SimulatedLLMClient)


def test_con_clave_de_gemini_usa_gemini() -> None:
    assert isinstance(build_llm_client(make_settings(gemini_api_key="clave-de-prueba")), GeminiLLMClient)
