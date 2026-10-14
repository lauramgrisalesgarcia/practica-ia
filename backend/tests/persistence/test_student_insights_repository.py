from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.persistence.repositories.student_insights_repository import SqlAlchemyStudentInsightsRepository
from tests.factories import create_lesson, create_material, create_student, create_submission, create_user

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def test_lista_solo_las_clases_realizadas_del_estudiante(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
    john = create_student(db_session, teacher=teacher, email="john@correo.com")
    done = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    create_lesson(db_session, student=emma, teacher=teacher, date=NOW + timedelta(days=1))
    create_lesson(db_session, student=john, teacher=teacher, date=NOW - timedelta(days=1))

    lessons = SqlAlchemyStudentInsightsRepository(db_session).list_completed_by_student(emma.public_id, until=NOW)

    assert [(lesson.id, lesson.topic, lesson.date) for lesson in lessons] == [(done.public_id, done.topic, done.date)]


def test_incluye_el_material_con_sus_ejercicios_y_la_entrega_con_su_nota(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    without_material = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=3))
    pending = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=2))
    solved = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    pending_material = create_material(db_session, lesson=pending, exercise_count=4)
    submission = create_submission(
        db_session, material=create_material(db_session, lesson=solved), student=emma, score=Decimal("66.67")
    )

    lessons = SqlAlchemyStudentInsightsRepository(db_session).list_completed_by_student(emma.public_id, until=NOW)
    by_id = {lesson.id: lesson for lesson in lessons}

    empty = by_id[without_material.public_id]
    assert (empty.material_generated_at, empty.exercise_count, empty.submitted_at, empty.score) == (None, None, None, None)
    assert by_id[pending.public_id].material_generated_at == pending_material.generated_at
    assert by_id[pending.public_id].exercise_count == 4
    assert by_id[pending.public_id].submitted_at is None
    assert by_id[solved.public_id].submitted_at == submission.submitted_at
    assert by_id[solved.public_id].score == Decimal("66.67")
