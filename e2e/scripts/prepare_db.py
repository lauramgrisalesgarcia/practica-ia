"""Prepara la BD de los tests E2E: la crea si no existe, la vacía, aplica las migraciones y carga el seed.

Se ejecuta desde backend/ (lo lanza playwright.config.ts) con DATABASE_URL apuntando a la BD de E2E y
SEED_USER_PASSWORD en el entorno. Por seguridad solo actúa sobre una BD cuyo nombre termina en «_e2e»:
nunca puede vaciar la de desarrollo ni la de tests.
"""

import os
import re
import sys

# El script vive fuera de backend/: se ejecuta con backend/ como directorio de trabajo para importar app
sys.path.insert(0, os.getcwd())

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from app.persistence import seed  # noqa: E402


def main() -> None:
    url = make_url(os.environ["DATABASE_URL"])
    name = url.database or ""
    if not re.fullmatch(r"[a-z0-9_]+_e2e", name):
        sys.exit(f"La BD de E2E debe llamarse «…_e2e» (solo minúsculas, números y _); se recibió «{name}».")

    admin = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        exists = connection.scalar(text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": name})
        if not exists:
            connection.execute(text(f'CREATE DATABASE "{name}"'))
    admin.dispose()

    engine = create_engine(url)
    with engine.begin() as connection:
        connection.execute(text("DROP SCHEMA public CASCADE"))
        connection.execute(text("CREATE SCHEMA public"))
    engine.dispose()

    command.upgrade(Config("alembic.ini"), "head")
    seed.main()


if __name__ == "__main__":
    main()
