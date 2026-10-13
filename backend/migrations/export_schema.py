"""Genera migrations/001-esquema-base-de-datos.sql a partir de las migraciones de Alembic.

Uso (desde backend/):  uv run python -m migrations.export_schema

El SQL se obtiene con Alembic en modo offline (sin conectarse a la base de datos), así que
siempre coincide con lo que aplican las migraciones. Un test verifica que el archivo
guardado está sincronizado (tests/migrations/test_schema_sql.py).
"""

import io
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory

BACKEND = Path(__file__).resolve().parents[1]
SCHEMA_FILE = Path(__file__).resolve().parent / "001-esquema-base-de-datos.sql"

_HEADER = """\
-- =====================================================================================
-- Esquema de la base de datos — Práctica IA
-- =====================================================================================
--
-- Script SQL equivalente a aplicar todas las migraciones de Alembic (de <base> a head)
-- sobre una base de datos PostgreSQL 16 vacía.
--
-- ARCHIVO GENERADO: no se edita a mano. La fuente de verdad son las migraciones de
-- migrations/versions/. Tras añadir o cambiar una migración, regenéralo (desde backend/):
--
--     uv run python -m migrations.export_schema
--
-- Un test (tests/migrations/test_schema_sql.py) falla si este archivo no está sincronizado.
--
-- Migraciones incluidas (en orden):
{migrations}
--
-- Tablas:
--   users                    Docentes y estudiantes (rol docente | estudiante).
--   student_profiles         Datos del estudiante: docente asignado, idioma natal y nivel MCER.
--   lessons                  Clases: fecha, tema, contexto, palabras clave, notas y PDF.
--   reinforcement_materials  Material de refuerzo de una clase (máx. 1) y la petición al LLM.
--   material_submissions     Único intento del estudiante para un material (máx. 1).
--   alembic_version          Control de versiones de Alembic.
--
-- Convenciones:
--   - "id" (SERIAL) es interno y nunca se expone en la API; "public_id" (UUID v4 aleatorio)
--     es el identificador público.
--   - Las reglas de integridad del negocio viven también en la BD (CHECK y UNIQUE):
--     un material por clase, un intento por material, 1-15 ejercicios, score 0-100...
--   - Todas las fechas son TIMESTAMP WITH TIME ZONE.
-- =====================================================================================

"""


def _config(output: io.StringIO | None = None) -> Config:
    config = Config(str(BACKEND / "alembic.ini"), output_buffer=output)
    config.set_main_option("script_location", str(BACKEND / "migrations"))
    return config


def _migration_list() -> str:
    revisions = list(reversed(list(ScriptDirectory.from_config(_config()).walk_revisions())))
    return "\n".join(
        f"--   {number}. {revision.revision}  {revision.doc}" for number, revision in enumerate(revisions, start=1)
    )


def render_schema_sql() -> str:
    output = io.StringIO()
    command.upgrade(_config(output), "head", sql=True)
    body = "\n".join(line.rstrip() for line in output.getvalue().strip().splitlines())
    return _HEADER.format(migrations=_migration_list()) + body + "\n"


def main() -> None:
    SCHEMA_FILE.write_text(render_schema_sql(), encoding="utf-8", newline="\n")
    print(f"Esquema generado en {SCHEMA_FILE.relative_to(BACKEND)}")


if __name__ == "__main__":
    main()
