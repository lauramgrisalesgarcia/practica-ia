from datetime import UTC, datetime

import pytest

from app.domain.entities import Role
from app.domain.errors import AccessDeniedError
from app.domain.use_cases.get_student_insights import GetStudentInsights
from tests.domain.fakes import FixedClock, InMemoryStudentInsightsRepository, make_student_insight_lesson, make_user, uid

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def test_calcula_los_indicadores_con_las_clases_realizadas_del_estudiante() -> None:
    student = make_user(user_id=uid(10), role=Role.ESTUDIANTE)
    repository = InMemoryStudentInsightsRepository(
        {
            uid(10): [
                make_student_insight_lesson(date=datetime(2026, 10, 8, 16, tzinfo=UTC)),
                make_student_insight_lesson(date=datetime(2026, 10, 20, 16, tzinfo=UTC)),  # futura: no cuenta
            ],
            uid(11): [make_student_insight_lesson(date=datetime(2026, 10, 9, 16, tzinfo=UTC))],  # de otro estudiante
        }
    )
    use_case = GetStudentInsights(insights=repository, clock=FixedClock(NOW))

    insights = use_case.execute(student)

    assert insights.lessons_count == 1
    assert repository.requested == [(uid(10), NOW)]


def test_un_docente_no_puede_ver_los_indicadores_del_estudiante() -> None:
    teacher = make_user(user_id=uid(1), role=Role.DOCENTE)
    use_case = GetStudentInsights(insights=InMemoryStudentInsightsRepository(), clock=FixedClock(NOW))

    with pytest.raises(AccessDeniedError):
        use_case.execute(teacher)
