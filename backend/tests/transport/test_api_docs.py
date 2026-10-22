from fastapi.testclient import TestClient

from app.main import create_app
from tests.core.settings_factory import make_settings


def test_por_defecto_expone_la_documentacion_interactiva() -> None:
    client = TestClient(create_app(make_settings()))

    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def test_sin_documentacion_no_expone_swagger_redoc_ni_el_esquema() -> None:
    client = TestClient(create_app(make_settings(api_docs_enabled=False)))

    assert client.get("/docs").status_code == 404
    assert client.get("/redoc").status_code == 404
    assert client.get("/openapi.json").status_code == 404
