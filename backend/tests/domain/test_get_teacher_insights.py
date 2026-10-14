from datetime import UTC, datetime

import pytest

from app.domain.entities import Role
from app.domain.errors import AccessDeniedError
from app.domain.use_cases.get_teacher_insights import GetTeacherInsights
from tests.domain.fakes import FixedClock, InMemoryTeacherInsightsRepository, make_insight_lesson, make_user, uid

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def test_calcula_los_indicadores_con_las_clases_realizadas_del_docente() -> None:
    teacher = make_user(user_id=uid(1), role=Role.DOCENTE)
    repository = InMemoryTeacherInsightsRepository(
        {
            uid(1): [
                make_insight_lesson(date=datetime(2026, 10, 8, 16, tzinfo=UTC)),
                make_insight_lesson(date=datetime(2026, 10, 20, 16, tzinfo=UTC)),  # futura: no cuenta
            ],
            uid(2): [make_insight_lesson(date=datetime(2026, 10, 9, 16, tzinfo=UTC))],  # de otro docente
        }
    )
    use_case = GetTeacherInsights(insights=repository, clock=FixedClock(NOW))

    insights = use_case.execute(teacher)

    assert insights.lessons_this_month == 1
    assert repository.requested == [(uid(1), NOW)]


def test_un_estudiante_no_puede_ver_los_indicadores() -> None:
    student = make_user(user_id=uid(10), role=Role.ESTUDIANTE)
    use_case = GetTeacherInsights(insights=InMemoryTeacherInsightsRepository(), clock=FixedClock(NOW))

    with pytest.raises(AccessDeniedError):
        use_case.execute(student)
