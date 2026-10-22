import logging
from datetime import timedelta

import pytest
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.domain.entities import Role
from app.core.login_throttle import MAX_FAILED_ATTEMPTS
from app.core.tokens import create_access_token, decode_access_token
from tests.factories import create_user

PASSWORD = "Docente#2026"


class TestLogin:
    def test_un_inicio_de_sesion_fallido_queda_registrado_con_el_origen_y_sin_la_contraseña(
        self, client: TestClient, db_session: Session, caplog: pytest.LogCaptureFixture
    ) -> None:
        create_user(db_session, email="docente@colegio.edu", password=PASSWORD)

        with caplog.at_level(logging.WARNING, logger="app"):
            client.post("/auth/login", json={"email": "docente@colegio.edu", "password": "Otra#2026"})

        assert "Inicio de sesión fallido desde testclient" in caplog.text
        assert "Otra#2026" not in caplog.text

    def test_un_inicio_de_sesion_bloqueado_queda_registrado(
        self, client: TestClient, db_session: Session, caplog: pytest.LogCaptureFixture
    ) -> None:
        create_user(db_session, email="docente@colegio.edu", password=PASSWORD)
        wrong = {"email": "docente@colegio.edu", "password": "Otra#2026"}
        for _ in range(MAX_FAILED_ATTEMPTS):
            client.post("/auth/login", json=wrong)

        with caplog.at_level(logging.WARNING, logger="app"):
            client.post("/auth/login", json=wrong)

        assert "Inicio de sesión bloqueado por demasiados intentos desde testclient" in caplog.text

    def test_tras_5_intentos_fallidos_bloquea_incluso_la_contraseña_correcta(
        self, client: TestClient, db_session: Session
    ) -> None:
        create_user(db_session, email="docente@colegio.edu", password=PASSWORD)
        wrong = {"email": "docente@colegio.edu", "password": "Otra#2026"}
        for _ in range(MAX_FAILED_ATTEMPTS):
            assert client.post("/auth/login", json=wrong).status_code == 401

        response = client.post("/auth/login", json={"email": "docente@colegio.edu", "password": PASSWORD})

        assert response.status_code == 429
        assert response.json() == {"detail": "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo."}

    def test_devuelve_token_y_datos_del_usuario(self, client: TestClient, db_session: Session) -> None:
        user = create_user(db_session, email="docente@colegio.edu", password=PASSWORD)

        response = client.post("/auth/login", json={"email": "docente@colegio.edu", "password": PASSWORD})

        assert response.status_code == 200
        body = response.json()
        assert body["token_type"] == "bearer"
        assert body["expires_in"] == 3600
        assert decode_access_token(body["access_token"]) == user.public_id
        assert body["user"] == {
            "id": str(user.public_id),
            "first_name": "María",
            "last_name": "López",
            "email": "docente@colegio.edu",
            "role": "docente",
        }

    def test_devuelve_el_rol_de_estudiante(self, client: TestClient, db_session: Session) -> None:
        create_user(db_session, email="emma@correo.com", password=PASSWORD, role=Role.ESTUDIANTE)

        response = client.post("/auth/login", json={"email": "emma@correo.com", "password": PASSWORD})

        assert response.status_code == 200
        assert response.json()["user"]["role"] == "estudiante"

    def test_el_correo_no_distingue_mayusculas(self, client: TestClient, db_session: Session) -> None:
        create_user(db_session, email="docente@colegio.edu", password=PASSWORD)

        response = client.post("/auth/login", json={"email": "Docente@Colegio.EDU", "password": PASSWORD})

        assert response.status_code == 200

    @pytest.mark.parametrize(
        ("email", "password"),
        [
            ("docente@colegio.edu", "Incorrecta#1"),
            ("nadie@colegio.edu", PASSWORD),
        ],
        ids=["contraseña incorrecta", "correo inexistente"],
    )
    def test_rechaza_credenciales_incorrectas_con_mensaje_generico(
        self, client: TestClient, db_session: Session, email: str, password: str
    ) -> None:
        create_user(db_session, email="docente@colegio.edu", password=PASSWORD)

        response = client.post("/auth/login", json={"email": email, "password": password})

        assert response.status_code == 401
        assert response.json() == {"detail": "Credenciales incorrectas"}

    @pytest.mark.parametrize(
        "payload",
        [
            {"email": "no-es-un-correo", "password": PASSWORD},
            {"email": "docente@colegio.edu", "password": ""},
            {"email": "docente@colegio.edu"},
        ],
        ids=["correo inválido", "contraseña vacía", "sin contraseña"],
    )
    def test_rechaza_datos_mal_formados(self, client: TestClient, payload: dict[str, str]) -> None:
        response = client.post("/auth/login", json=payload)

        assert response.status_code == 422

    def test_no_aplica_reglas_de_complejidad_a_la_contraseña(
        self, client: TestClient, db_session: Session
    ) -> None:
        create_user(db_session, email="docente@colegio.edu", password="abc")

        response = client.post("/auth/login", json={"email": "docente@colegio.edu", "password": "abc"})

        assert response.status_code == 200


class TestUsuarioActual:
    def test_devuelve_el_usuario_del_token(self, client: TestClient, db_session: Session) -> None:
        user = create_user(db_session, email="emma@correo.com", role=Role.ESTUDIANTE, first_name="Emma", last_name="Schmidt")
        token = create_access_token(user_id=user.public_id)

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        assert response.json() == {
            "id": str(user.public_id),
            "first_name": "Emma",
            "last_name": "Schmidt",
            "email": "emma@correo.com",
            "role": "estudiante",
        }

    def test_funciona_con_el_token_del_login(self, client: TestClient, db_session: Session) -> None:
        create_user(db_session, email="docente@colegio.edu", password=PASSWORD)
        token = client.post("/auth/login", json={"email": "docente@colegio.edu", "password": PASSWORD}).json()[
            "access_token"
        ]

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 200
        assert response.json()["email"] == "docente@colegio.edu"

    def test_sin_token_responde_401(self, client: TestClient) -> None:
        response = client.get("/auth/me")

        assert response.status_code == 401
        assert response.json() == {"detail": "No autenticado"}
        assert response.headers["www-authenticate"] == "Bearer"

    def test_token_invalido_responde_401(self, client: TestClient) -> None:
        response = client.get("/auth/me", headers={"Authorization": "Bearer token-falso"})

        assert response.status_code == 401
        assert response.json() == {"detail": "No autenticado"}

    def test_token_caducado_responde_401(self, client: TestClient, db_session: Session) -> None:
        user = create_user(db_session)
        token = create_access_token(user_id=user.public_id, expires_delta=timedelta(seconds=-1))

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 401

    def test_token_de_un_usuario_que_ya_no_existe_responde_401(self, client: TestClient) -> None:
        token = create_access_token(user_id=uuid4())

        response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert response.status_code == 401
