from datetime import UTC, datetime, timedelta

import pytest

from app.domain.entities import MaterialStatus, Role
from app.domain.errors import AccessDeniedError
from app.domain.use_cases.list_my_lessons import ListMyLessons
from tests.domain.fakes import FixedClock, InMemoryLessonRepository, make_lesson, make_user, uid

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)
EMMA = make_user(user_id=uid(10), role=Role.ESTUDIANTE)
JOHN = make_user(user_id=uid(11), role=Role.ESTUDIANTE)
OLDER = make_lesson(date=NOW - timedelta(days=14))
RECENT = make_lesson(date=NOW - timedelta(days=2), material_status=MaterialStatus.PENDING)
FUTURE = make_lesson(date=NOW + timedelta(days=3))
OTHER = make_lesson(date=NOW - timedelta(days=1))


def build() -> ListMyLessons:
    return ListMyLessons(
        lessons=InMemoryLessonRepository(
            [(EMMA.id, OLDER), (EMMA.id, FUTURE), (EMMA.id, RECENT), (JOHN.id, OTHER)]
        ),
        clock=FixedClock(NOW),
    )


def test_devuelve_sus_clases_realizadas_de_la_mas_reciente_a_la_mas_antigua() -> None:
    assert build().execute(EMMA) == [RECENT, OLDER]


def test_un_docente_no_tiene_historial_de_estudiante() -> None:
    with pytest.raises(AccessDeniedError):
        build().execute(make_user(user_id=uid(1), role=Role.DOCENTE))
