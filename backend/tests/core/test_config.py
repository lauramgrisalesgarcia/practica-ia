import secrets

import pytest
from pydantic import SecretStr, ValidationError

from app.core.config import Settings
from tests.core.settings_factory import DATABASE_URL, make_settings


def test_la_url_de_la_base_de_datos_es_obligatoria(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(ValidationError, match="database_url"):
        Settings(_env_file=None, jwt_secret=SecretStr(secrets.token_urlsafe(32)))


def test_la_clave_jwt_es_obligatoria(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("JWT_SECRET", raising=False)

    with pytest.raises(ValidationError, match="jwt_secret"):
        Settings(_env_file=None, database_url=SecretStr(DATABASE_URL))


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


def test_la_clave_de_gemini_es_opcional_y_queda_sin_usar_si_no_se_define() -> None:
    settings = make_settings()

    assert settings.gemini_api_key is None


def test_la_clave_de_gemini_no_aparece_al_imprimir_la_configuracion() -> None:
    gemini_key = "clave-gemini-de-prueba"
    settings = Settings(
        _env_file=None,
        database_url=SecretStr(DATABASE_URL),
        jwt_secret=SecretStr(secrets.token_urlsafe(32)),
        gemini_api_key=SecretStr(gemini_key),
    )

    texto = f"{settings} {settings!r} {settings.model_dump()}"

    assert gemini_key not in texto
    assert settings.gemini_api_key is not None
    assert settings.gemini_api_key.get_secret_value() == gemini_key


def test_una_clave_de_gemini_vacia_cuenta_como_no_configurada() -> None:
    settings = Settings(
        _env_file=None,
        database_url=SecretStr(DATABASE_URL),
        jwt_secret=SecretStr(secrets.token_urlsafe(32)),
        gemini_api_key=SecretStr(""),
    )

    assert settings.gemini_api_key is None


def test_el_modelo_de_gemini_por_defecto_es_uno_disponible_para_cuentas_nuevas() -> None:
    assert make_settings().gemini_model == "gemini-3.8-flash"


def test_un_modelo_de_gemini_vacio_usa_el_modelo_por_defecto() -> None:
    assert make_settings(gemini_model="").gemini_model == "gemini-3.8-flash"
