from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.domain.entities import MaterialStatus
from app.persistence.repositories.lesson_repository import SqlAlchemyLessonRepository
from tests.factories import create_lesson, create_material, create_student, create_submission, create_user

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def test_cuenta_solo_las_clases_realizadas_del_estudiante(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
    john = create_student(db_session, teacher=teacher, email="john@correo.com")
    create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=7))
    create_lesson(db_session, student=emma, teacher=teacher, date=NOW)
    create_lesson(db_session, student=emma, teacher=teacher, date=NOW + timedelta(days=1))
    create_lesson(db_session, student=john, teacher=teacher, date=NOW - timedelta(days=1))

    count = SqlAlchemyLessonRepository(db_session).count_completed_by_student(emma.public_id, until=NOW)

    assert count == 2


def test_cuenta_cero_si_no_hay_clases(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)

    assert SqlAlchemyLessonRepository(db_session).count_completed_by_student(emma.public_id, until=NOW) == 0


def test_lista_las_clases_realizadas_de_la_mas_reciente_a_la_mas_antigua(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
    john = create_student(db_session, teacher=teacher, email="john@correo.com")
    older = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=14), topic="Presentarse")
    recent = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=2))
    create_lesson(db_session, student=emma, teacher=teacher, date=NOW + timedelta(days=3))
    create_lesson(db_session, student=john, teacher=teacher, date=NOW - timedelta(days=1))

    lessons = SqlAlchemyLessonRepository(db_session).list_completed_by_student(emma.public_id, until=NOW)

    assert [lesson.id for lesson in lessons] == [recent.public_id, older.public_id]
    assert lessons[1].topic == "Presentarse"
    assert lessons[1].duration_minutes == 60
    assert lessons[1].context == older.context


def test_calcula_el_estado_del_material_de_cada_clase(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    without_material = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=3))
    pending = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=2))
    completed = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    create_material(db_session, lesson=pending)
    create_submission(db_session, material=create_material(db_session, lesson=completed), student=emma)

    lessons = SqlAlchemyLessonRepository(db_session).list_completed_by_student(emma.public_id, until=NOW)

    status = {lesson.id: lesson.material_status for lesson in lessons}
    assert status == {
        without_material.public_id: MaterialStatus.NONE,
        pending.public_id: MaterialStatus.PENDING,
        completed.public_id: MaterialStatus.COMPLETED,
    }
