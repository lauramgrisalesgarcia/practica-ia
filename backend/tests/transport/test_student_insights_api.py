from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.composition import get_clock
from app.core.tokens import create_access_token
from tests.domain.fakes import FixedClock
from tests.factories import create_lesson, create_material, create_student, create_submission, create_user

NOW = datetime(2026, 10, 13, 12, 0, tzinfo=UTC)


def auth_header(user_id: UUID) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user_id=user_id)}"}


@pytest.fixture
def fixed_clock(client: TestClient) -> None:
    app: Any = client.app
    app.dependency_overrides[get_clock] = lambda: FixedClock(NOW)


@pytest.mark.usefixtures("fixed_clock")
def test_devuelve_los_indicadores_del_estudiante(client: TestClient, db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    pending = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=2), topic="Presentarse")
    solved = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    create_lesson(db_session, student=emma, teacher=teacher, date=NOW + timedelta(days=1))
    create_material(db_session, lesson=pending, exercise_count=4)
    submission = create_submission(
        db_session, material=create_material(db_session, lesson=solved), student=emma, score=Decimal("66.67")
    )

    response = client.get("/students/me/insights", headers=auth_header(emma.public_id))

    assert response.status_code == 200
    body = response.json()
    assert body["lessons_count"] == 2
    assert body["completed_materials"] == 1
    assert body["average_score"] == 66.67
    [pending_item] = body["pending_materials"]
    assert datetime.fromisoformat(pending_item.pop("date")) == pending.date
    assert pending_item == {"lesson_id": str(pending.public_id), "topic": "Presentarse", "exercise_count": 4}
    assert {item["type"] for item in body["recent_activity"]} == {"lesson", "material", "submission"}
    assert [item["lesson_id"] for item in body["calendar"]] == [str(pending.public_id), str(solved.public_id)]
    [point] = body["score_history"]
    assert datetime.fromisoformat(point.pop("submitted_at")) == submission.submitted_at
    assert point == {"lesson_id": str(solved.public_id), "topic": solved.topic, "score": 66.67}


def test_un_docente_recibe_403(client: TestClient, db_session: Session) -> None:
    teacher = create_user(db_session)

    response = client.get("/students/me/insights", headers=auth_header(teacher.public_id))

    assert response.status_code == 403


def test_sin_token_responde_401(client: TestClient) -> None:
    assert client.get("/students/me/insights").status_code == 401
