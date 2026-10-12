"""Comprueba que las capas solo dependen en la dirección permitida.

transport → domain ← persistence. El dominio no conoce frameworks ni las otras capas.
"""

import ast
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parents[2] / "app"


def imported_modules(package: str) -> dict[str, set[str]]:
    result: dict[str, set[str]] = {}
    for path in (APP / package).rglob("*.py"):
        modules: set[str] = set()
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            if isinstance(node, ast.Import):
                modules.update(alias.name for alias in node.names)
            elif isinstance(node, ast.ImportFrom) and node.module:
                modules.add(node.module)
        result[str(path.relative_to(APP))] = modules
    return result


def violations(package: str, forbidden: tuple[str, ...]) -> list[str]:
    return sorted(
        f"{file} importa {module}"
        for file, modules in imported_modules(package).items()
        for module in modules
        if module.startswith(forbidden)
    )


def test_las_tres_capas_existen() -> None:
    for package in ("transport", "domain", "persistence"):
        assert (APP / package).is_dir(), f"falta la capa {package}"


@pytest.mark.parametrize(
    ("package", "forbidden"),
    [
        ("domain", ("app.transport", "app.persistence", "app.core", "fastapi", "sqlalchemy", "pydantic")),
        ("persistence", ("app.transport", "fastapi")),
        ("transport", ("app.persistence.models", "sqlalchemy")),
    ],
    ids=["dominio", "persistencia", "transporte"],
)
def test_cada_capa_respeta_sus_dependencias(package: str, forbidden: tuple[str, ...]) -> None:
    assert violations(package, forbidden) == []
