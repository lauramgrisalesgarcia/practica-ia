"""El esquema SQL documentado está sincronizado con las migraciones de Alembic.

Si este test falla tras añadir o cambiar una migración, regenera el archivo (desde backend/):

    uv run python -m migrations.export_schema
"""

from migrations.export_schema import SCHEMA_FILE, render_schema_sql


def test_el_esquema_sql_esta_sincronizado_con_las_migraciones() -> None:
    saved = SCHEMA_FILE.read_text(encoding="utf-8")

    assert saved == render_schema_sql(), (
        f"{SCHEMA_FILE.name} no coincide con las migraciones. "
        "Regenera el archivo con: uv run python -m migrations.export_schema"
    )


def test_el_esquema_incluye_todas_las_tablas() -> None:
    sql = render_schema_sql()

    for table in ("users", "student_profiles", "lessons", "reinforcement_materials", "material_submissions"):
        assert f"CREATE TABLE {table} (" in sql
