from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy.orm import Session

from app.persistence.repositories.lesson_repository import SqlAlchemyLessonRepository
from tests.factories import create_lesson, create_student, create_user

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def test_devuelve_el_nombre_y_la_ruta_del_pdf(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW, pdf_filename="restaurante-a2.pdf")

    pdf = SqlAlchemyLessonRepository(db_session).get_pdf_for_teacher(teacher.public_id, lesson.public_id)

    assert pdf == ("restaurante-a2.pdf", lesson.pdf_path)


def test_no_devuelve_el_pdf_de_clases_de_otro_docente(db_session: Session) -> None:
    teacher = create_user(db_session, email="docente@colegio.edu")
    other_teacher = create_user(db_session, email="otro@colegio.edu")
    pierre = create_student(db_session, teacher=other_teacher, email="pierre@correo.com")
    lesson = create_lesson(db_session, student=pierre, teacher=other_teacher, date=NOW)

    repository = SqlAlchemyLessonRepository(db_session)

    assert repository.get_pdf_for_teacher(teacher.public_id, lesson.public_id) is None
    assert repository.get_pdf_for_teacher(teacher.public_id, uuid4()) is None


def test_el_estudiante_obtiene_el_pdf_de_sus_clases(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW, pdf_filename="restaurante-a2.pdf")

    pdf = SqlAlchemyLessonRepository(db_session).get_pdf_for_student(emma.public_id, lesson.public_id)

    assert pdf == ("restaurante-a2.pdf", lesson.pdf_path)


def test_el_estudiante_no_obtiene_el_pdf_de_clases_de_otro_estudiante(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
    john = create_student(db_session, teacher=teacher, email="john@correo.com")
    lesson = create_lesson(db_session, student=john, teacher=teacher, date=NOW)

    repository = SqlAlchemyLessonRepository(db_session)

    assert repository.get_pdf_for_student(emma.public_id, lesson.public_id) is None
    assert repository.get_pdf_for_student(emma.public_id, uuid4()) is None
