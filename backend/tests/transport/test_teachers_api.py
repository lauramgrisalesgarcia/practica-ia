from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.tokens import create_access_token
from app.domain.entities import Level
from app.persistence.file_storage import LocalFileStorage
from tests.factories import create_lesson, create_material, create_student, create_submission, create_user


def auth_header(user_id: UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id=user_id)}"}


class TestListarMisEstudiantes:
    def test_devuelve_los_estudiantes_del_docente_ordenados(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session, email="docente@colegio.edu")
        emma = create_student(
            db_session, teacher=teacher, email="emma@correo.com", first_name="Emma", last_name="Schmidt",
            native_language="de", level=Level.A2,
        )
        john = create_student(
            db_session, teacher=teacher, email="john@correo.com", first_name="John", last_name="Miller",
            native_language="en", level=Level.B1,
        )

        response = client.get("/teachers/me/students", headers=auth_header(teacher.public_id))

        assert response.status_code == 200
        assert response.json() == [
            {
                "id": str(john.public_id),
                "first_name": "John",
                "last_name": "Miller",
                "email": "john@correo.com",
                "native_language": "en",
                "level": "B1",
            },
            {
                "id": str(emma.public_id),
                "first_name": "Emma",
                "last_name": "Schmidt",
                "email": "emma@correo.com",
                "native_language": "de",
                "level": "A2",
            },
        ]

    def test_no_incluye_estudiantes_de_otros_docentes(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session, email="docente@colegio.edu")
        other_teacher = create_user(db_session, email="otro@colegio.edu")
        create_student(db_session, teacher=other_teacher, email="pierre@correo.com")

        response = client.get("/teachers/me/students", headers=auth_header(teacher.public_id))

        assert response.status_code == 200
        assert response.json() == []

    def test_un_estudiante_recibe_403(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        student = create_student(db_session, teacher=teacher)

        response = client.get("/teachers/me/students", headers=auth_header(student.public_id))

        assert response.status_code == 403
        assert response.json() == {"detail": "No tienes permiso para acceder a este recurso"}

    def test_sin_token_recibe_401(self, client: TestClient) -> None:
        response = client.get("/teachers/me/students")

        assert response.status_code == 401



class TestDetalleDeUnEstudiante:
    def test_devuelve_los_datos_y_las_clases_tomadas(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(
            db_session, teacher=teacher, email="emma@correo.com", first_name="Emma", last_name="Schmidt",
            native_language="de", level=Level.A2,
        )
        now = datetime.now(UTC)
        create_lesson(db_session, student=emma, teacher=teacher, date=now - timedelta(days=7))
        create_lesson(db_session, student=emma, teacher=teacher, date=now - timedelta(days=1))
        create_lesson(db_session, student=emma, teacher=teacher, date=now + timedelta(days=7))

        response = client.get(f"/teachers/me/students/{emma.public_id}", headers=auth_header(teacher.public_id))

        assert response.status_code == 200
        assert response.json() == {
            "id": str(emma.public_id),
            "first_name": "Emma",
            "last_name": "Schmidt",
            "email": "emma@correo.com",
            "native_language": "de",
            "level": "A2",
            "lessons_count": 2,
        }

    def test_un_estudiante_de_otro_docente_responde_404(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session, email="docente@colegio.edu")
        other_teacher = create_user(db_session, email="otro@colegio.edu")
        pierre = create_student(db_session, teacher=other_teacher, email="pierre@correo.com")

        response = client.get(f"/teachers/me/students/{pierre.public_id}", headers=auth_header(teacher.public_id))

        assert response.status_code == 404
        assert response.json() == {"detail": "Estudiante no encontrado"}

    def test_un_id_que_no_es_uuid_responde_422(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)

        response = client.get("/teachers/me/students/1", headers=auth_header(teacher.public_id))

        assert response.status_code == 422

    def test_un_estudiante_inexistente_responde_404(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)

        response = client.get(f"/teachers/me/students/{uuid4()}", headers=auth_header(teacher.public_id))

        assert response.status_code == 404

    def test_un_estudiante_recibe_403(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)

        response = client.get(f"/teachers/me/students/{emma.public_id}", headers=auth_header(emma.public_id))

        assert response.status_code == 403

    def test_sin_token_responde_401(self, client: TestClient) -> None:
        response = client.get(f"/teachers/me/students/{uuid4()}")

        assert response.status_code == 401


class TestHistorialDeClasesDeUnEstudiante:
    def test_devuelve_las_clases_realizadas_con_el_estado_del_material(
        self, client: TestClient, db_session: Session
    ) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        now = datetime.now(UTC).replace(microsecond=0)
        older = create_lesson(
            db_session, student=emma, teacher=teacher, date=now - timedelta(days=14),
            topic="Presentarse", context="Presentarse y hablar de la familia en una reunión",
        )
        recent = create_lesson(
            db_session, student=emma, teacher=teacher, date=now - timedelta(days=2), duration_minutes=45,
            topic="Pedir en un restaurante", context="Pedir comida y bebida en un restaurante",
        )
        create_lesson(db_session, student=emma, teacher=teacher, date=now + timedelta(days=3))
        create_material(db_session, lesson=recent)

        response = client.get(f"/teachers/me/students/{emma.public_id}/lessons", headers=auth_header(teacher.public_id))

        assert response.status_code == 200
        body = response.json()
        assert [lesson["id"] for lesson in body] == [str(recent.public_id), str(older.public_id)]
        assert body[0] == {
            "id": str(recent.public_id),
            "date": body[0]["date"],
            "duration_minutes": 45,
            "topic": "Pedir en un restaurante",
            "context": "Pedir comida y bebida en un restaurante",
            "material_status": "pending",
        }
        assert datetime.fromisoformat(body[0]["date"]) == recent.date
        assert body[1]["material_status"] == "none"

    def test_un_estudiante_de_otro_docente_responde_404(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session, email="docente@colegio.edu")
        pierre = create_student(db_session, teacher=create_user(db_session, email="otro@colegio.edu"))

        response = client.get(f"/teachers/me/students/{pierre.public_id}/lessons", headers=auth_header(teacher.public_id))

        assert response.status_code == 404
        assert response.json() == {"detail": "Estudiante no encontrado"}

    def test_un_estudiante_recibe_403(self, client: TestClient, db_session: Session) -> None:
        emma = create_student(db_session, teacher=create_user(db_session))

        response = client.get(f"/teachers/me/students/{emma.public_id}/lessons", headers=auth_header(emma.public_id))

        assert response.status_code == 403

    def test_sin_token_responde_401(self, client: TestClient) -> None:
        response = client.get(f"/teachers/me/students/{uuid4()}/lessons")

        assert response.status_code == 401


class TestDetalleDeUnaClase:
    def test_devuelve_el_detalle_con_material_y_resultado(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(
            db_session, teacher=teacher, first_name="Emma", last_name="Schmidt", native_language="de", level=Level.A2
        )
        lesson = create_lesson(
            db_session,
            student=emma,
            teacher=teacher,
            date=datetime.now(UTC) - timedelta(days=4),
            topic="Pedir en un restaurante",
            context="Pedir comida y bebida en un restaurante",
            keywords=["la carta", "quisiera"],
            notes="Confunde quiero y quisiera.",
            pdf_filename="restaurante-a2.pdf",
        )
        material = create_material(db_session, lesson=lesson, exercise_count=1)
        create_submission(db_session, material=material, student=emma)

        response = client.get(f"/teachers/me/lessons/{lesson.public_id}", headers=auth_header(teacher.public_id))

        assert response.status_code == 200
        body = response.json()
        assert datetime.fromisoformat(body.pop("date")) == lesson.date
        assert datetime.fromisoformat(body["material"].pop("generated_at")) == material.generated_at
        assert body["submission"].pop("submitted_at")
        assert body == {
            "id": str(lesson.public_id),
            "duration_minutes": 60,
            "topic": "Pedir en un restaurante",
            "context": "Pedir comida y bebida en un restaurante",
            "material_status": "completed",
            "keywords": ["la carta", "quisiera"],
            "notes": "Confunde quiero y quisiera.",
            "pdf": {"filename": "restaurante-a2.pdf", "url": f"/teachers/me/lessons/{lesson.public_id}/pdf"},
            "student": {
                "id": str(emma.public_id),
                "first_name": "Emma",
                "last_name": "Schmidt",
                "native_language": "de",
                "level": "A2",
            },
            "material": {
                "activity_type": "complete_sentence",
                "exercise_count": 1,
                "title": "Actividad",
                "instructions": "Completa",
                "exercises": [{"id": 1, "sentence": "Frase ___ 1", "options": ["a", "b"], "correct_option": "a"}],
            },
            "submission": {"correct_count": 1, "incorrect_count": 0, "score": 100.0},
        }

    def test_sin_material_devuelve_material_y_resultado_nulos(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC) - timedelta(days=1))

        response = client.get(f"/teachers/me/lessons/{lesson.public_id}", headers=auth_header(teacher.public_id))

        assert response.status_code == 200
        assert response.json()["material_status"] == "none"
        assert response.json()["material"] is None
        assert response.json()["submission"] is None

    def test_una_clase_de_otro_docente_responde_404(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session, email="docente@colegio.edu")
        other_teacher = create_user(db_session, email="otro@colegio.edu")
        pierre = create_student(db_session, teacher=other_teacher, email="pierre@correo.com")
        lesson = create_lesson(db_session, student=pierre, teacher=other_teacher, date=datetime.now(UTC))

        response = client.get(f"/teachers/me/lessons/{lesson.public_id}", headers=auth_header(teacher.public_id))

        assert response.status_code == 404
        assert response.json() == {"detail": "Clase no encontrada"}

    def test_un_estudiante_recibe_403(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC))

        response = client.get(f"/teachers/me/lessons/{lesson.public_id}", headers=auth_header(emma.public_id))

        assert response.status_code == 403

    def test_sin_token_responde_401(self, client: TestClient) -> None:
        response = client.get(f"/teachers/me/lessons/{uuid4()}")

        assert response.status_code == 401


class TestPdfDeUnaClase:
    def test_descarga_el_pdf(self, client: TestClient, db_session: Session, file_storage: LocalFileStorage) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(
            db_session, student=emma, teacher=teacher, date=datetime.now(UTC), pdf_filename="restaurante-a2.pdf"
        )
        file_storage.write(lesson.pdf_path, b"%PDF-1.4 contenido de la clase")

        response = client.get(f"/teachers/me/lessons/{lesson.public_id}/pdf", headers=auth_header(teacher.public_id))

        assert response.status_code == 200
        assert response.content == b"%PDF-1.4 contenido de la clase"
        assert response.headers["content-type"] == "application/pdf"
        assert response.headers["content-disposition"] == 'inline; filename="restaurante-a2.pdf"'
        assert response.headers["x-content-type-options"] == "nosniff"

    def test_el_nombre_del_archivo_no_puede_inyectar_cabeceras(
        self, client: TestClient, db_session: Session, file_storage: LocalFileStorage
    ) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(
            db_session,
            student=emma,
            teacher=teacher,
            date=datetime.now(UTC),
            pdf_filename='mal"nombre\r\nX-Inyectada: si.pdf',
            pdf_path="lessons/prueba/seguro.pdf",
        )
        file_storage.write(lesson.pdf_path, b"%PDF-1.4")

        response = client.get(f"/teachers/me/lessons/{lesson.public_id}/pdf", headers=auth_header(teacher.public_id))

        assert response.status_code == 200
        assert "x-inyectada" not in response.headers
        assert response.headers["content-disposition"] == 'inline; filename="malnombreX-Inyectada si.pdf"'

    def test_una_clase_de_otro_docente_responde_404(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session, email="docente@colegio.edu")
        other_teacher = create_user(db_session, email="otro@colegio.edu")
        pierre = create_student(db_session, teacher=other_teacher, email="pierre@correo.com")
        lesson = create_lesson(db_session, student=pierre, teacher=other_teacher, date=datetime.now(UTC))

        response = client.get(f"/teachers/me/lessons/{lesson.public_id}/pdf", headers=auth_header(teacher.public_id))

        assert response.status_code == 404
        assert response.json() == {"detail": "Clase no encontrada"}

    def test_si_falta_el_archivo_responde_404(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC))

        response = client.get(f"/teachers/me/lessons/{lesson.public_id}/pdf", headers=auth_header(teacher.public_id))

        assert response.status_code == 404
        assert response.json() == {"detail": "El PDF de la clase no está disponible"}

    def test_un_estudiante_recibe_403(self, client: TestClient, db_session: Session) -> None:
        teacher = create_user(db_session)
        emma = create_student(db_session, teacher=teacher)
        lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC))

        response = client.get(f"/teachers/me/lessons/{lesson.public_id}/pdf", headers=auth_header(emma.public_id))

        assert response.status_code == 403

    def test_sin_token_responde_401(self, client: TestClient) -> None:
        response = client.get(f"/teachers/me/lessons/{uuid4()}/pdf")

        assert response.status_code == 401
