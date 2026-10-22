import logging
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
from app.persistence.models import LessonModel, ReinforcementMaterialModel, UserModel
from tests.factories import create_lesson, create_material, create_student, create_submission, create_user


def auth_header(user_id: UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id=user_id)}"}


def url(lesson: LessonModel) -> str:
    return f"/teachers/me/lessons/{lesson.public_id}/material"


@pytest.fixture
def lesson_setup(db_session: Session) -> tuple[UserModel, UserModel, LessonModel]:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(
        db_session,
        student=emma,
        teacher=teacher,
        date=datetime.now(UTC) - timedelta(days=4),
        keywords=["la carta", "quisiera", "para beber"],
    )
    return teacher, emma, lesson


def test_genera_el_material_con_el_llm_simulado(
    client: TestClient, lesson_setup: tuple[UserModel, UserModel, LessonModel]
) -> None:
    teacher, _, lesson = lesson_setup

    response = client.post(
        url(lesson),
        json={"activity_type": "complete_sentence", "exercise_count": 3},
        headers=auth_header(teacher.public_id),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["lesson_id"] == str(lesson.public_id)
    assert body["activity_type"] == "complete_sentence"
    assert body["exercise_count"] == 3
    assert len(body["exercises"]) == 3
    assert all(exercise["sentence"].count("___") == 1 for exercise in body["exercises"])
    assert all(exercise["correct_option"] in exercise["options"] for exercise in body["exercises"])
    assert datetime.fromisoformat(body["generated_at"])


def test_el_material_queda_pendiente_en_el_detalle_de_la_clase(
    client: TestClient, lesson_setup: tuple[UserModel, UserModel, LessonModel]
) -> None:
    teacher, _, lesson = lesson_setup
    client.post(url(lesson), json={"activity_type": "complete_sentence", "exercise_count": 2}, headers=auth_header(teacher.public_id))

    detail = client.get(f"/teachers/me/lessons/{lesson.public_id}", headers=auth_header(teacher.public_id)).json()

    assert detail["material_status"] == "pending"
    assert detail["material"]["exercise_count"] == 2


def test_las_palabras_clave_revisadas_se_envian_al_llm_sin_modificar_la_clase(
    client: TestClient, db_session: Session, lesson_setup: tuple[UserModel, UserModel, LessonModel]
) -> None:
    teacher, _, lesson = lesson_setup

    response = client.post(
        url(lesson),
        json={
            "activity_type": "complete_sentence",
            "exercise_count": 2,
            "keywords": [" la carta ", "de segundo", "la carta"],
        },
        headers=auth_header(teacher.public_id),
    )

    assert response.status_code == 201
    material = db_session.scalar(select(ReinforcementMaterialModel))
    assert material is not None
    assert material.llm_request["lesson"]["keywords"] == ["la carta", "de segundo"]
    db_session.refresh(lesson)
    assert lesson.keywords == ["la carta", "quisiera", "para beber"]


@pytest.mark.parametrize(
    "payload",
    [
        {"activity_type": "complete_sentence", "exercise_count": 0},
        {"activity_type": "complete_sentence", "exercise_count": 16},
        {"activity_type": "multiple_choice", "exercise_count": 3},
        {"exercise_count": 3},
        {"activity_type": "complete_sentence", "exercise_count": 3, "keywords": []},
        {"activity_type": "complete_sentence", "exercise_count": 3, "keywords": ["   "]},
        {"activity_type": "complete_sentence", "exercise_count": 3, "keywords": ["x" * 51]},
        {"activity_type": "complete_sentence", "exercise_count": 3, "keywords": [f"p{n}" for n in range(21)]},
    ],
    ids=[
        "0 ejercicios",
        "16 ejercicios",
        "tipo no soportado",
        "sin tipo",
        "lista de palabras vacía",
        "palabra en blanco",
        "palabra demasiado larga",
        "más de 20 palabras",
    ],
)
def test_rechaza_peticiones_invalidas(
    client: TestClient, lesson_setup: tuple[UserModel, UserModel, LessonModel], payload: dict[str, Any]
) -> None:
    teacher, _, lesson = lesson_setup

    response = client.post(url(lesson), json=payload, headers=auth_header(teacher.public_id))

    assert response.status_code == 422


def test_una_clase_futura_responde_409(client: TestClient, db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=datetime.now(UTC) + timedelta(days=2))

    response = client.post(url(lesson), json={"activity_type": "complete_sentence", "exercise_count": 3}, headers=auth_header(teacher.public_id))

    assert response.status_code == 409
    assert response.json() == {"detail": "Solo se puede generar material para clases ya realizadas"}


def test_un_material_pendiente_no_se_vuelve_a_generar(
    client: TestClient, db_session: Session, lesson_setup: tuple[UserModel, UserModel, LessonModel]
) -> None:
    teacher, _, lesson = lesson_setup
    create_material(db_session, lesson=lesson)

    response = client.post(url(lesson), json={"activity_type": "complete_sentence", "exercise_count": 3}, headers=auth_header(teacher.public_id))

    assert response.status_code == 409
    assert response.json() == {"detail": "El material de refuerzo de esta clase ya se generó y no se puede volver a generar"}


def test_un_material_ya_resuelto_no_se_vuelve_a_generar(
    client: TestClient, db_session: Session, lesson_setup: tuple[UserModel, UserModel, LessonModel]
) -> None:
    teacher, emma, lesson = lesson_setup
    create_submission(db_session, material=create_material(db_session, lesson=lesson), student=emma)

    response = client.post(url(lesson), json={"activity_type": "complete_sentence", "exercise_count": 3}, headers=auth_header(teacher.public_id))

    assert response.status_code == 409
    assert response.json() == {"detail": "El material de refuerzo de esta clase ya se generó y no se puede volver a generar"}


class BrokenLLMClient(LLMClient):
    def generate_material(self, request: Mapping[str, Any]) -> object:
        return {"title": "sin ejercicios"}

    def generate_recommendations(self, request: Mapping[str, Any]) -> object:
        return {}


class UnavailableLLMClient(LLMClient):
    def generate_material(self, request: Mapping[str, Any]) -> object:
        raise TimeoutError("lectura agotada")

    def generate_recommendations(self, request: Mapping[str, Any]) -> object:
        return {}


def test_un_fallo_del_llm_queda_registrado_con_su_causa(
    client: TestClient,
    lesson_setup: tuple[UserModel, UserModel, LessonModel],
    caplog: pytest.LogCaptureFixture,
) -> None:
    teacher, _, lesson = lesson_setup
    app: Any = client.app
    app.dependency_overrides[get_llm_client] = lambda: UnavailableLLMClient()

    with caplog.at_level(logging.ERROR, logger="app"):
        response = client.post(
            url(lesson), json={"activity_type": "complete_sentence", "exercise_count": 3}, headers=auth_header(teacher.public_id)
        )

    del app.dependency_overrides[get_llm_client]
    assert response.status_code == 502
    assert "No se pudo generar el material de refuerzo: el LLM no respondió" in caplog.text
    assert "TimeoutError('lectura agotada')" in caplog.text


@pytest.fixture
def broken_llm(client: TestClient) -> Iterator[None]:
    app: Any = client.app
    app.dependency_overrides[get_llm_client] = lambda: BrokenLLMClient()
    yield
    del app.dependency_overrides[get_llm_client]


@pytest.mark.usefixtures("broken_llm")
def test_una_respuesta_invalida_del_llm_responde_502_y_no_guarda_nada(
    client: TestClient, db_session: Session, lesson_setup: tuple[UserModel, UserModel, LessonModel]
) -> None:
    teacher, _, lesson = lesson_setup

    response = client.post(url(lesson), json={"activity_type": "complete_sentence", "exercise_count": 3}, headers=auth_header(teacher.public_id))

    assert response.status_code == 502
    assert response.json() == {"detail": "No se pudo generar el material de refuerzo"}
    assert db_session.scalar(select(ReinforcementMaterialModel)) is None


def test_una_clase_de_otro_docente_responde_404(client: TestClient, db_session: Session) -> None:
    teacher = create_user(db_session, email="docente@colegio.edu")
    other_teacher = create_user(db_session, email="otro@colegio.edu")
    pierre = create_student(db_session, teacher=other_teacher, email="pierre@correo.com")
    lesson = create_lesson(db_session, student=pierre, teacher=other_teacher, date=datetime.now(UTC) - timedelta(days=1))

    response = client.post(url(lesson), json={"activity_type": "complete_sentence", "exercise_count": 3}, headers=auth_header(teacher.public_id))

    assert response.status_code == 404


def test_un_estudiante_recibe_403(client: TestClient, lesson_setup: tuple[UserModel, UserModel, LessonModel]) -> None:
    _, emma, lesson = lesson_setup

    response = client.post(url(lesson), json={"activity_type": "complete_sentence", "exercise_count": 3}, headers=auth_header(emma.public_id))

    assert response.status_code == 403


def test_sin_token_responde_401(client: TestClient) -> None:
    response = client.post(
        f"/teachers/me/lessons/{uuid4()}/material", json={"activity_type": "complete_sentence", "exercise_count": 3}
    )

    assert response.status_code == 401
