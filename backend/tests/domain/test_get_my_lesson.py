from datetime import UTC, datetime

import pytest

from app.domain.entities import Role
from app.domain.errors import AccessDeniedError, LessonNotFoundError
from app.domain.use_cases.get_my_lesson import GetMyLesson
from tests.domain.fakes import InMemoryLessonRepository, make_lesson, make_user, uid

STUDENT = make_user(user_id=uid(10), role=Role.ESTUDIANTE)
LESSON = make_lesson(date=datetime(2026, 10, 8, 16, tzinfo=UTC), lesson_id=uid(100))


def test_devuelve_una_clase_del_estudiante() -> None:
    use_case = GetMyLesson(lessons=InMemoryLessonRepository(lessons=[(uid(10), LESSON)]))

    assert use_case.execute(STUDENT, uid(100)) == LESSON


def test_una_clase_de_otro_estudiante_no_se_encuentra() -> None:
    use_case = GetMyLesson(lessons=InMemoryLessonRepository(lessons=[(uid(11), LESSON)]))

    with pytest.raises(LessonNotFoundError):
        use_case.execute(STUDENT, uid(100))


def test_un_docente_no_puede_ver_las_clases_del_estudiante() -> None:
    use_case = GetMyLesson(lessons=InMemoryLessonRepository())

    with pytest.raises(AccessDeniedError):
        use_case.execute(make_user(user_id=uid(1), role=Role.DOCENTE), uid(100))
