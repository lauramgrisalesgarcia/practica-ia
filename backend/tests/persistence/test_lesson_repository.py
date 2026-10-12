from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.persistence.repositories.lesson_repository import SqlAlchemyLessonRepository
from tests.factories import create_lesson, create_student, create_user

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def test_cuenta_solo_las_clases_realizadas_del_estudiante(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
    john = create_student(db_session, teacher=teacher, email="john@correo.com")
    create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=7))
    create_lesson(db_session, student=emma, teacher=teacher, date=NOW)
    create_lesson(db_session, student=emma, teacher=teacher, date=NOW + timedelta(days=1))
    create_lesson(db_session, student=john, teacher=teacher, date=NOW - timedelta(days=1))

    count = SqlAlchemyLessonRepository(db_session).count_completed_by_student(emma.id, until=NOW)

    assert count == 2


def test_cuenta_cero_si_no_hay_clases(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)

    assert SqlAlchemyLessonRepository(db_session).count_completed_by_student(emma.id, until=NOW) == 0
