from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.persistence.repositories.teacher_insights_repository import SqlAlchemyTeacherInsightsRepository
from tests.factories import create_lesson, create_material, create_student, create_submission, create_user

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def test_lista_solo_las_clases_realizadas_de_los_estudiantes_del_docente(db_session: Session) -> None:
    teacher = create_user(db_session)
    other_teacher = create_user(db_session, email="otro@colegio.edu")
    emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
    john = create_student(db_session, teacher=other_teacher, email="john@correo.com")
    done = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    create_lesson(db_session, student=emma, teacher=teacher, date=NOW + timedelta(days=1))
    create_lesson(db_session, student=john, teacher=other_teacher, date=NOW - timedelta(days=1))

    lessons = SqlAlchemyTeacherInsightsRepository(db_session).list_completed_by_teacher(teacher.public_id, until=NOW)

    assert [lesson.id for lesson in lessons] == [done.public_id]
    assert lessons[0].student_name == "Emma Schmidt"
    assert lessons[0].topic == done.topic
    assert lessons[0].date == done.date


def test_incluye_cuando_se_genero_el_material_y_la_entrega_con_su_nota(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    without_material = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=3))
    completed = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    material = create_material(db_session, lesson=completed)
    submission = create_submission(db_session, material=material, student=emma, score=Decimal("66.67"))

    lessons = SqlAlchemyTeacherInsightsRepository(db_session).list_completed_by_teacher(teacher.public_id, until=NOW)
    by_id = {lesson.id: lesson for lesson in lessons}

    empty = by_id[without_material.public_id]
    assert (empty.material_generated_at, empty.submitted_at, empty.score) == (None, None, None)
    solved = by_id[completed.public_id]
    assert solved.material_generated_at == material.generated_at
    assert solved.submitted_at == submission.submitted_at
    assert solved.score == Decimal("66.67")


def test_las_clases_son_del_docente_al_que_esta_asignado_el_estudiante(db_session: Session) -> None:
    teacher = create_user(db_session)
    previous_teacher = create_user(db_session, email="anterior@colegio.edu")
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=previous_teacher, date=NOW - timedelta(days=1))

    repository = SqlAlchemyTeacherInsightsRepository(db_session)

    assert [item.id for item in repository.list_completed_by_teacher(teacher.public_id, until=NOW)] == [lesson.public_id]
    assert repository.list_completed_by_teacher(previous_teacher.public_id, until=NOW) == []
