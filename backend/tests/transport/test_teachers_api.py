from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.tokens import create_access_token
from app.domain.entities import Level
from tests.factories import create_lesson, create_student, create_user


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
