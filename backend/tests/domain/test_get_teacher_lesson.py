from datetime import UTC, datetime

import pytest

from app.domain.entities import Role
from app.domain.errors import AccessDeniedError, LessonNotFoundError
from app.domain.use_cases.get_teacher_lesson import GetTeacherLesson
from tests.domain.fakes import InMemoryLessonRepository, make_lesson_detail, make_student, make_user, uid

TEACHER = make_user(user_id=uid(1), role=Role.DOCENTE)
EMMA = make_student(student_id=uid(10))
LESSON = make_lesson_detail(student=EMMA, date=datetime(2026, 10, 8, 16, 0, tzinfo=UTC), lesson_id=uid(100))


def build() -> GetTeacherLesson:
    return GetTeacherLesson(lessons=InMemoryLessonRepository(details_by_teacher={TEACHER.id: [LESSON]}))


def test_devuelve_el_detalle_de_la_clase() -> None:
    assert build().execute(TEACHER, LESSON.summary.id) == LESSON


def test_una_clase_de_un_estudiante_de_otro_docente_no_se_encuentra() -> None:
    other_teacher = make_user(user_id=uid(2), role=Role.DOCENTE)

    with pytest.raises(LessonNotFoundError):
        build().execute(other_teacher, LESSON.summary.id)


def test_una_clase_inexistente_no_se_encuentra() -> None:
    with pytest.raises(LessonNotFoundError):
        build().execute(TEACHER, uid(999))


def test_un_estudiante_no_puede_ver_el_detalle_desde_el_panel_del_docente() -> None:
    with pytest.raises(AccessDeniedError):
        build().execute(make_user(user_id=EMMA.id, role=Role.ESTUDIANTE), LESSON.summary.id)
