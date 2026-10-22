import os
import secrets
from collections.abc import Iterator
from pathlib import Path

import pytest
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class _TestSettings(BaseSettings):
    """La URL de la BD de test se lee de TEST_DATABASE_URL (variable de entorno o `.env`)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    test_database_url: SecretStr


# Los tests siempre usan la base de datos de test, nunca la de desarrollo.
os.environ["DATABASE_URL"] = _TestSettings().test_database_url.get_secret_value()
# Clave aleatoria en cada ejecución: ningún secreto queda escrito en el código.
os.environ["JWT_SECRET"] = secrets.token_urlsafe(32)
# Los tests nunca llaman a Gemini: una clave vacía (aunque esté en backend/.env) usa el LLM simulado.
os.environ["GEMINI_API_KEY"] = ""

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.composition import get_file_storage  # noqa: E402
from app.persistence.database import engine, get_session  # noqa: E402
from app.persistence.file_storage import LocalFileStorage  # noqa: E402
from app.main import create_app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def database_schema() -> Iterator[None]:
    """Crea el esquema con las migraciones de Alembic, igual que en un entorno real."""
    config = Config("alembic.ini")
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    yield


@pytest.fixture
def db_session() -> Iterator[Session]:
    """Sesión dentro de una transacción que se deshace al terminar cada test."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def file_storage(tmp_path: Path) -> LocalFileStorage:
    """Almacenamiento de archivos en una carpeta temporal de cada test."""
    return LocalFileStorage(tmp_path / "storage")


@pytest.fixture
def client(db_session: Session, file_storage: LocalFileStorage) -> Iterator[TestClient]:
    app = create_app()
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[get_file_storage] = lambda: file_storage
    with TestClient(app) as test_client:
        yield test_client
