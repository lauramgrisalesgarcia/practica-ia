from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.tokens import create_access_token
from app.persistence.file_storage import LocalFileStorage
from tests.factories import create_lesson, create_material, create_student, create_submission, create_user


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
            keywords=["la carta", "quisiera"],
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
            "keywords": ["la carta", "quisiera"],
            "score": None,
        }
        assert body[1]["material_status"] == "none"

    def test_incluye_la_nota_de_las_clases_resueltas(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC) - timedelta(days=1))
        create_submission(
            db_session, material=create_material(db_session, lesson=lesson), student=emma, score=Decimal("66.67")
        )

        response = client.get("/students/me/lessons", headers=auth_header(emma.public_id))

        assert response.status_code == 200
        [summary] = response.json()
        assert summary["material_status"] == "completed"
        assert summary["score"] == 66.67


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


class TestPdfDeMiClase:
    def test_descarga_el_pdf_de_una_de_mis_clases(
        self, client: TestClient, db_session: Session, file_storage: LocalFileStorage
    ) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(
            db_session, student=emma, teacher=teacher, date=datetime.now(UTC), pdf_filename="restaurante-a2.pdf"
        )
        file_storage.write(lesson.pdf_path, b"%PDF-1.4 contenido de la clase")

        response = client.get(f"/students/me/lessons/{lesson.public_id}/pdf", headers=auth_header(emma.public_id))

        assert response.status_code == 200
        assert response.content == b"%PDF-1.4 contenido de la clase"
        assert response.headers["content-type"] == "application/pdf"
        assert response.headers["content-disposition"] == 'inline; filename="restaurante-a2.pdf"'
        assert response.headers["x-content-type-options"] == "nosniff"

    def test_una_clase_de_otro_estudiante_responde_404(
        self, client: TestClient, db_session: Session, file_storage: LocalFileStorage
    ) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
        john = create_student(db_session, teacher=teacher, email="john@correo.com")
        lesson = create_lesson(db_session, student=john, teacher=teacher, date=datetime.now(UTC))
        file_storage.write(lesson.pdf_path, b"%PDF-1.4")

        response = client.get(f"/students/me/lessons/{lesson.public_id}/pdf", headers=auth_header(emma.public_id))

        assert response.status_code == 404
        assert response.json() == {"detail": "Clase no encontrada"}

    def test_si_falta_el_archivo_responde_404(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC))

        response = client.get(f"/students/me/lessons/{lesson.public_id}/pdf", headers=auth_header(emma.public_id))

        assert response.status_code == 404
        assert response.json() == {"detail": "El PDF de la clase no está disponible"}

    def test_un_docente_recibe_403(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC))

        response = client.get(f"/students/me/lessons/{lesson.public_id}/pdf", headers=auth_header(teacher.public_id))

        assert response.status_code == 403

    def test_sin_token_responde_401(self, client: TestClient) -> None:
        response = client.get(f"/students/me/lessons/{uuid4()}/pdf")

        assert response.status_code == 401


class TestDetalleDeMiClase:
    def test_devuelve_la_clase_sin_las_notas_del_docente(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(
            db_session, student=emma, teacher=teacher, date=datetime.now(UTC) - timedelta(days=1),
            topic="Pedir en un restaurante", context="Pedir comida y bebida", keywords=["la carta"],
            notes="Confunde quiero y quisiera", pdf_filename="restaurante-a2.pdf",
        )
        create_submission(
            db_session, material=create_material(db_session, lesson=lesson), student=emma, score=Decimal("50")
        )

        response = client.get(f"/students/me/lessons/{lesson.public_id}", headers=auth_header(emma.public_id))

        assert response.status_code == 200
        body = response.json()
        assert datetime.fromisoformat(body.pop("date")) == lesson.date
        assert body == {
            "id": str(lesson.public_id),
            "duration_minutes": 60,
            "topic": "Pedir en un restaurante",
            "context": "Pedir comida y bebida",
            "material_status": "completed",
            "keywords": ["la carta"],
            "score": 50.0,
            "pdf": {"filename": "restaurante-a2.pdf", "url": f"/students/me/lessons/{lesson.public_id}/pdf"},
        }

    def test_una_clase_de_otro_estudiante_responde_404(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
        john = create_student(db_session, teacher=teacher, email="john@correo.com")
        lesson = create_lesson(db_session, student=john, teacher=teacher, date=datetime.now(UTC) - timedelta(days=1))

        response = client.get(f"/students/me/lessons/{lesson.public_id}", headers=auth_header(emma.public_id))

        assert response.status_code == 404
        assert response.json() == {"detail": "Clase no encontrada"}

    def test_una_clase_inexistente_responde_404(self, client: TestClient, db_session: Session) -> None:
        emma = create_student(db_session, teacher=create_user(db_session))

        response = client.get(f"/students/me/lessons/{uuid4()}", headers=auth_header(emma.public_id))

        assert response.status_code == 404

    def test_un_docente_recibe_403(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)

        response = client.get(f"/students/me/lessons/{uuid4()}", headers=auth_header(teacher.public_id))

        assert response.status_code == 403

    def test_sin_token_responde_401(self, client: TestClient) -> None:
        assert client.get(f"/students/me/lessons/{uuid4()}").status_code == 401
