from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.tokens import create_access_token
from tests.factories import create_lesson, create_material, create_student, create_user


def auth_header(user_id: UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id=user_id)}"}


class TestMiHistorialDeClases:
    def test_devuelve_mis_clases_realizadas_con_pdf_y_estado_del_material(
        self, client: TestClient, db_session: Session
    ) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
        john = create_student(db_session, teacher=teacher, email="john@correo.com")
        now = datetime.now(UTC).replace(microsecond=0)
        older = create_lesson(
            db_session, student=emma, teacher=teacher, date=now - timedelta(days=14),
            topic="Presentarse", context="Presentarse en una reunión", pdf_filename="presentaciones-a2.pdf",
        )
        recent = create_lesson(
            db_session, student=emma, teacher=teacher, date=now - timedelta(days=2), duration_minutes=45,
            topic="Pedir en un restaurante", context="Pedir comida y bebida", pdf_filename="restaurante-a2.pdf",
        )
        create_lesson(db_session, student=emma, teacher=teacher, date=now + timedelta(days=3))
        create_lesson(db_session, student=john, teacher=teacher, date=now - timedelta(days=1))
        create_material(db_session, lesson=recent)

        response = client.get("/students/me/lessons", headers=auth_header(emma.public_id))

        assert response.status_code == 200
        body = response.json()
        assert [lesson["id"] for lesson in body] == [str(recent.public_id), str(older.public_id)]
        assert datetime.fromisoformat(body[0].pop("date")) == recent.date
        assert body[0] == {
            "id": str(recent.public_id),
            "duration_minutes": 45,
            "topic": "Pedir en un restaurante",
            "context": "Pedir comida y bebida",
            "material_status": "pending",
            "pdf": {"filename": "restaurante-a2.pdf", "url": f"/students/me/lessons/{recent.public_id}/pdf"},
        }
        assert body[1]["material_status"] == "none"

    def test_sin_clases_devuelve_lista_vacia(self, client: TestClient, db_session: Session) -> None:
        emma = create_student(db_session, teacher=create_user(db_session))

        response = client.get("/students/me/lessons", headers=auth_header(emma.public_id))

        assert response.status_code == 200
        assert response.json() == []

    def test_un_docente_recibe_403(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)

        response = client.get("/students/me/lessons", headers=auth_header(teacher.public_id))

        assert response.status_code == 403

    def test_sin_token_responde_401(self, client: TestClient) -> None:
        response = client.get("/students/me/lessons")

        assert response.status_code == 401
