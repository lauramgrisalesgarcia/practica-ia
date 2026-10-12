from datetime import UTC, datetime, timedelta

import pytest

from app.domain.entities import Role, StudentDetail
from app.domain.errors import AccessDeniedError, StudentNotFoundError
from app.domain.use_cases.get_teacher_student import GetTeacherStudent
from tests.domain.fakes import FixedClock, InMemoryLessonRepository, InMemoryStudentRepository, make_student, make_user

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)
TEACHER = make_user(user_id=1, role=Role.DOCENTE)
EMMA = make_student(student_id=10)


def build(lessons: list[tuple[int, datetime]] | None = None) -> GetTeacherStudent:
    return GetTeacherStudent(
        students=InMemoryStudentRepository({TEACHER.id: [EMMA]}),
        lessons=InMemoryLessonRepository(lessons),
        clock=FixedClock(NOW),
    )


def test_devuelve_el_estudiante_con_sus_clases_tomadas() -> None:
    use_case = build([(EMMA.id, NOW - timedelta(days=7)), (EMMA.id, NOW - timedelta(days=1))])

    assert use_case.execute(TEACHER, EMMA.id) == StudentDetail(student=EMMA, lessons_count=2)


def test_no_cuenta_las_clases_futuras() -> None:
    use_case = build([(EMMA.id, NOW - timedelta(days=1)), (EMMA.id, NOW + timedelta(days=1))])

    assert use_case.execute(TEACHER, EMMA.id).lessons_count == 1


def test_un_estudiante_de_otro_docente_no_se_encuentra() -> None:
    other_teacher = make_user(user_id=2, role=Role.DOCENTE)

    with pytest.raises(StudentNotFoundError):
        build().execute(other_teacher, EMMA.id)


def test_un_estudiante_inexistente_no_se_encuentra() -> None:
    with pytest.raises(StudentNotFoundError):
        build().execute(TEACHER, 999)


def test_un_estudiante_no_puede_ver_el_detalle() -> None:
    requester = make_user(user_id=EMMA.id, role=Role.ESTUDIANTE)

    with pytest.raises(AccessDeniedError):
        build().execute(requester, EMMA.id)
