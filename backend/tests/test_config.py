import secrets

import pytest
from pydantic import ValidationError

from app.config import Settings

DATABASE_URL = "postgresql+psycopg://usuario:clave-de-bd@127.0.0.1:5433/base"


def make_settings(**overrides: str) -> Settings:
    values = {"database_url": DATABASE_URL, "jwt_secret": secrets.token_urlsafe(32)} | overrides
    return Settings(_env_file=None, **values)  # type: ignore[arg-type]


def test_la_url_de_la_base_de_datos_es_obligatoria(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(ValidationError, match="database_url"):
        Settings(_env_file=None, jwt_secret=secrets.token_urlsafe(32))  # type: ignore[call-arg]


def test_la_clave_jwt_es_obligatoria(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(ValidationError, match="jwt_secret"):
        Settings(_env_file=None, database_url=DATABASE_URL)  # type: ignore[call-arg]


def test_rechaza_una_clave_jwt_de_menos_de_32_caracteres() -> None:
    with pytest.raises(ValidationError, match="jwt_secret"):
        make_settings(jwt_secret="corta")


def test_los_secretos_no_aparecen_al_imprimir_la_configuracion() -> None:
    jwt_secret = secrets.token_urlsafe(32)
    settings = make_settings(jwt_secret=jwt_secret)

    texto = f"{settings} {settings!r} {settings.model_dump()}"

    assert jwt_secret not in texto
    assert "clave-de-bd" not in texto


def test_los_secretos_siguen_disponibles_para_la_aplicacion() -> None:
    jwt_secret = secrets.token_urlsafe(32)
    settings = make_settings(jwt_secret=jwt_secret)

    assert settings.jwt_secret.get_secret_value() == jwt_secret
    assert settings.database_url.get_secret_value() == DATABASE_URL
