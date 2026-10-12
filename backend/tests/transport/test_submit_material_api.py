from collections.abc import Iterator, Mapping
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.composition import get_llm_client
from app.core.tokens import create_access_token
from app.domain.ports import LLMClient
from app.llm.simulated import SimulatedLLMClient
from app.persistence.models import LessonModel, MaterialSubmissionModel, UserModel
from tests.factories import create_lesson, create_material, create_student, create_user

# El material de la factoría tiene ejercicios con opciones ["a", "b"] y respuesta correcta "a".
ALL_CORRECT = [{"exercise_id": 1, "selected_option": "a"}, {"exercise_id": 2, "selected_option": "a"}]
ONE_WRONG = [{"exercise_id": 1, "selected_option": "a"}, {"exercise_id": 2, "selected_option": "b"}]


def auth_header(user_id: UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id=user_id)}"}


def url(lesson: LessonModel) -> str:
    return f"/students/me/lessons/{lesson.public_id}/material/submission"


@pytest.fixture
def setup(db_session: Session) -> tuple[UserModel, UserModel, LessonModel]:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC) - timedelta(days=2))
    create_material(db_session, lesson=lesson, exercise_count=2)
    return teacher, emma, lesson


def test_resuelve_el_material_y_devuelve_la_correccion_con_recomendaciones(
    client: TestClient, setup: tuple[UserModel, UserModel, LessonModel]
) -> None:
    _, emma, lesson = setup

    response = client.post(url(lesson), json={"answers": ONE_WRONG}, headers=auth_header(emma.public_id))

    assert response.status_code == 201
    body = response.json()
    assert datetime.fromisoformat(body.pop("submitted_at"))
    assert body.pop("feedback")
    assert 1 <= len(body.pop("recommendations")) <= 5
    assert body == {
        "lesson_id": str(lesson.public_id),
        "correct_count": 1,
        "incorrect_count": 1,
        "score": 50.0,
        "results": [
            {"exercise_id": 1, "selected_option": "a", "correct_option": "a", "is_correct": True},
            {"exercise_id": 2, "selected_option": "b", "correct_option": "a", "is_correct": False},
        ],
    }


def test_el_resultado_queda_guardado(
    client: TestClient, setup: tuple[UserModel, UserModel, LessonModel]
) -> None:
    _, emma, lesson = setup
    client.post(url(lesson), json={"answers": ALL_CORRECT}, headers=auth_header(emma.public_id))

    material = client.get(f"/students/me/lessons/{lesson.public_id}/material", headers=auth_header(emma.public_id))
    history = client.get("/students/me/lessons", headers=auth_header(emma.public_id))

    assert material.json()["submission"]["score"] == 100.0
    assert history.json()[0]["material_status"] == "completed"


def test_solo_se_puede_resolver_una_vez(client: TestClient, setup: tuple[UserModel, UserModel, LessonModel]) -> None:
    _, emma, lesson = setup
    client.post(url(lesson), json={"answers": ALL_CORRECT}, headers=auth_header(emma.public_id))

    response = client.post(url(lesson), json={"answers": ONE_WRONG}, headers=auth_header(emma.public_id))

    assert response.status_code == 409
    assert response.json() == {"detail": "El material ya fue resuelto"}


def test_respuestas_incompletas_responden_422(
    client: TestClient, db_session: Session, setup: tuple[UserModel, UserModel, LessonModel]
) -> None:
    _, emma, lesson = setup

    response = client.post(url(lesson), json={"answers": ALL_CORRECT[:1]}, headers=auth_header(emma.public_id))

    assert response.status_code == 422
    assert response.json() == {"detail": "Debes responder todos los ejercicios con una opción válida"}
    assert db_session.scalar(select(MaterialSubmissionModel)) is None


@pytest.mark.parametrize(
    "payload",
    [{}, {"answers": []}, {"answers": [{"exercise_id": 1, "selected_option": ""}]}, {"answers": [{"exercise_id": 1}]}],
    ids=["sin respuestas", "lista vacía", "opción vacía", "sin opción"],
)
def test_peticiones_mal_formadas_responden_422(
    client: TestClient, setup: tuple[UserModel, UserModel, LessonModel], payload: dict[str, Any]
) -> None:
    _, emma, lesson = setup

    response = client.post(url(lesson), json=payload, headers=auth_header(emma.public_id))

    assert response.status_code == 422


class BrokenRecommendationsLLM(LLMClient):
    def generate_material(self, request: Mapping[str, Any]) -> object:
        return SimulatedLLMClient().generate_material(request)

    def generate_recommendations(self, request: Mapping[str, Any]) -> object:
        return {"feedback": "", "recommendations": []}


@pytest.fixture
def broken_llm(client: TestClient) -> Iterator[None]:
    app: Any = client.app
    app.dependency_overrides[get_llm_client] = lambda: BrokenRecommendationsLLM()
    yield
    del app.dependency_overrides[get_llm_client]


def test_recomendaciones_invalidas_responden_502_y_permiten_reintentar(
    client: TestClient, db_session: Session, setup: tuple[UserModel, UserModel, LessonModel], broken_llm: None
) -> None:
    _, emma, lesson = setup

    response = client.post(url(lesson), json={"answers": ALL_CORRECT}, headers=auth_header(emma.public_id))

    assert response.status_code == 502
    assert response.json() == {"detail": "No se pudieron generar las recomendaciones"}
    assert db_session.scalar(select(MaterialSubmissionModel)) is None

    app: Any = client.app
    del app.dependency_overrides[get_llm_client]
    retry = client.post(url(lesson), json={"answers": ALL_CORRECT}, headers=auth_header(emma.public_id))
    app.dependency_overrides[get_llm_client] = lambda: BrokenRecommendationsLLM()

    assert retry.status_code == 201


def test_una_clase_sin_material_responde_404(client: TestClient, db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC) - timedelta(days=1))

    response = client.post(url(lesson), json={"answers": ALL_CORRECT}, headers=auth_header(emma.public_id))

    assert response.status_code == 404
    assert response.json() == {"detail": "La clase no tiene material de refuerzo"}


def test_una_clase_de_otro_estudiante_responde_404(
    client: TestClient, db_session: Session, setup: tuple[UserModel, UserModel, LessonModel]
) -> None:
    teacher, _, lesson = setup
    john = create_student(db_session, teacher=teacher, email="john@correo.com")

    response = client.post(url(lesson), json={"answers": ALL_CORRECT}, headers=auth_header(john.public_id))

    assert response.status_code == 404
    assert response.json() == {"detail": "Clase no encontrada"}


def test_un_docente_recibe_403(client: TestClient, setup: tuple[UserModel, UserModel, LessonModel]) -> None:
    teacher, _, lesson = setup

    response = client.post(url(lesson), json={"answers": ALL_CORRECT}, headers=auth_header(teacher.public_id))

    assert response.status_code == 403


def test_sin_token_responde_401(client: TestClient) -> None:
    response = client.post(
        f"/students/me/lessons/{uuid4()}/material/submission", json={"answers": ALL_CORRECT}
    )

    assert response.status_code == 401
