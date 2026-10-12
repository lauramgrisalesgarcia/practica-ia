from datetime import UTC, datetime, timedelta

import pytest

from app.domain.entities import MaterialStatus, Role
from app.domain.errors import AccessDeniedError, StudentNotFoundError
from app.domain.use_cases.list_student_lessons import ListStudentLessons
from tests.domain.fakes import (
    FixedClock,
    InMemoryLessonRepository,
    InMemoryStudentRepository,
    make_lesson,
    make_student,
    make_user,
    uid,
)

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)
TEACHER = make_user(user_id=uid(1), role=Role.DOCENTE)
EMMA = make_student(student_id=uid(10))
OLDER = make_lesson(date=NOW - timedelta(days=14), material_status=MaterialStatus.COMPLETED)
RECENT = make_lesson(date=NOW - timedelta(days=2), material_status=MaterialStatus.PENDING)
FUTURE = make_lesson(date=NOW + timedelta(days=3))


def build() -> ListStudentLessons:
    return ListStudentLessons(
        students=InMemoryStudentRepository({TEACHER.id: [EMMA]}),
        lessons=InMemoryLessonRepository([(EMMA.id, OLDER), (EMMA.id, FUTURE), (EMMA.id, RECENT)]),
        clock=FixedClock(NOW),
    )


def test_devuelve_las_clases_realizadas_de_la_mas_reciente_a_la_mas_antigua() -> None:
    assert build().execute(TEACHER, EMMA.id) == [RECENT, OLDER]


def test_un_estudiante_de_otro_docente_no_se_encuentra() -> None:
    other_teacher = make_user(user_id=uid(2), role=Role.DOCENTE)

    with pytest.raises(StudentNotFoundError):
        build().execute(other_teacher, EMMA.id)


def test_un_estudiante_no_puede_ver_el_historial() -> None:
    requester = make_user(user_id=EMMA.id, role=Role.ESTUDIANTE)

    with pytest.raises(AccessDeniedError):
        build().execute(requester, EMMA.id)
