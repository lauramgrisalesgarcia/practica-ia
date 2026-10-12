from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.tokens import create_access_token
from app.persistence.models import LessonModel, UserModel
from tests.factories import create_lesson, create_material, create_student, create_submission, create_user


def auth_header(user_id: UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id=user_id)}"}


def url(lesson: LessonModel) -> str:
    return f"/students/me/lessons/{lesson.public_id}/material"


def keys(value: Any) -> set[str]:
    """Todas las claves de un JSON, a cualquier profundidad."""
    if isinstance(value, dict):
        return set(value) | {key for item in value.values() for key in keys(item)}
    if isinstance(value, list):
        return {key for item in value for key in keys(item)}
    return set()


def setup_lesson(db_session: Session) -> tuple[UserModel, UserModel, LessonModel]:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC) - timedelta(days=2))
    return teacher, emma, lesson


def test_antes_de_resolverlo_no_revela_las_respuestas_correctas(client: TestClient, db_session: Session) -> None:
    _, emma, lesson = setup_lesson(db_session)
    create_material(db_session, lesson=lesson, exercise_count=2)

    response = client.get(url(lesson), headers=auth_header(emma.public_id))

    assert response.status_code == 200
    body = response.json()
    assert "correct_option" not in keys(body)
    assert "correct_option" not in response.text
    assert body == {
        "lesson_id": str(lesson.public_id),
        "activity_type": "complete_sentence",
        "title": "Actividad",
        "instructions": "Completa",
        "exercises": [
            {"id": 1, "sentence": "Frase ___ 1", "options": ["a", "b"]},
            {"id": 2, "sentence": "Frase ___ 2", "options": ["a", "b"]},
        ],
        "submission": None,
    }


def test_despues_de_resolverlo_incluye_su_resultado(client: TestClient, db_session: Session) -> None:
    _, emma, lesson = setup_lesson(db_session)
    material = create_material(db_session, lesson=lesson, exercise_count=2)
    create_submission(
        db_session,
        material=material,
        student=emma,
        answers=[{"exercise_id": 1, "selected_option": "a"}, {"exercise_id": 2, "selected_option": "b"}],
        correct_count=1,
        incorrect_count=1,
        score=Decimal("50.00"),
    )

    response = client.get(url(lesson), headers=auth_header(emma.public_id))

    assert response.status_code == 200
    body = response.json()
    assert "correct_option" not in keys(body["exercises"])
    submission = body["submission"]
    assert datetime.fromisoformat(submission.pop("submitted_at"))
    assert submission == {
        "lesson_id": str(lesson.public_id),
        "correct_count": 1,
        "incorrect_count": 1,
        "score": 50.0,
        "results": [
            {"exercise_id": 1, "selected_option": "a", "correct_option": "a", "is_correct": True},
            {"exercise_id": 2, "selected_option": "b", "correct_option": "a", "is_correct": False},
        ],
        "feedback": "¡Muy bien!",
        "recommendations": ["Sigue así."],
    }


def test_una_clase_sin_material_responde_404(client: TestClient, db_session: Session) -> None:
    _, emma, lesson = setup_lesson(db_session)

    response = client.get(url(lesson), headers=auth_header(emma.public_id))

    assert response.status_code == 404
    assert response.json() == {"detail": "La clase no tiene material de refuerzo"}


def test_una_clase_de_otro_estudiante_responde_404(client: TestClient, db_session: Session) -> None:
    teacher, _, lesson = setup_lesson(db_session)
    create_material(db_session, lesson=lesson)
    john = create_student(db_session, teacher=teacher, email="john@correo.com")

    response = client.get(url(lesson), headers=auth_header(john.public_id))

    assert response.status_code == 404
    assert response.json() == {"detail": "Clase no encontrada"}


def test_un_docente_recibe_403(client: TestClient, db_session: Session) -> None:
    teacher, _, lesson = setup_lesson(db_session)
    create_material(db_session, lesson=lesson)

    response = client.get(url(lesson), headers=auth_header(teacher.public_id))

    assert response.status_code == 403


def test_sin_token_responde_401(client: TestClient) -> None:
    response = client.get(f"/students/me/lessons/{uuid4()}/material")

    assert response.status_code == 401
