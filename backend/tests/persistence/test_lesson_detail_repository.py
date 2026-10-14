from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy.orm import Session

from app.domain.entities import ActivityType, Exercise, Level, MaterialStatus
from app.persistence.repositories.lesson_repository import SqlAlchemyLessonRepository
from tests.factories import create_lesson, create_material, create_student, create_submission, create_user

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def test_detalle_de_una_clase_sin_material(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher, native_language="de", level=Level.A2)
    lesson = create_lesson(
        db_session,
        student=emma,
        teacher=teacher,
        date=NOW - timedelta(days=4),
        keywords=["la carta", "quisiera"],
        notes="Confunde quiero y quisiera.",
        pdf_filename="restaurante-a2.pdf",
    )

    detail = SqlAlchemyLessonRepository(db_session).get_detail_for_teacher(teacher.public_id, lesson.public_id)

    assert detail is not None
    assert detail.summary.id == lesson.public_id
    assert detail.summary.material_status is MaterialStatus.NONE
    assert detail.keywords == ("la carta", "quisiera")
    assert detail.notes == "Confunde quiero y quisiera."
    assert detail.summary.pdf_filename == "restaurante-a2.pdf"
    assert detail.student.id == emma.public_id
    assert detail.student.level is Level.A2
    assert detail.material is None
    assert detail.submission is None


def test_detalle_con_material_y_resultado(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=4))
    material = create_material(db_session, lesson=lesson, exercise_count=2)
    submission = create_submission(db_session, material=material, student=emma)

    detail = SqlAlchemyLessonRepository(db_session).get_detail_for_teacher(teacher.public_id, lesson.public_id)

    assert detail is not None
    assert detail.summary.material_status is MaterialStatus.COMPLETED
    assert detail.material is not None
    assert detail.material.activity_type is ActivityType.COMPLETE_SENTENCE
    assert detail.material.exercise_count == 2
    assert detail.material.title == "Actividad"
    assert detail.material.exercises[0] == Exercise(
        id=1, sentence="Frase ___ 1", options=("a", "b"), correct_option="a"
    )
    assert detail.submission is not None
    assert detail.submission.correct_count == 1
    assert detail.submission.incorrect_count == 0
    assert detail.submission.score == Decimal("100.00")
    assert detail.submission.submitted_at == submission.submitted_at


def test_no_devuelve_clases_de_estudiantes_de_otro_docente(db_session: Session) -> None:
    teacher = create_user(db_session, email="docente@colegio.edu")
    other_teacher = create_user(db_session, email="otro@colegio.edu")
    pierre = create_student(db_session, teacher=other_teacher, email="pierre@correo.com")
    lesson = create_lesson(db_session, student=pierre, teacher=other_teacher, date=NOW)

    repository = SqlAlchemyLessonRepository(db_session)

    assert repository.get_detail_for_teacher(teacher.public_id, lesson.public_id) is None
    assert repository.get_detail_for_teacher(teacher.public_id, uuid4()) is None


def test_resumen_de_una_clase_del_estudiante_con_su_nota(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1), keywords=["la carta"])
    create_submission(db_session, material=create_material(db_session, lesson=lesson), student=emma, score=Decimal("50"))

    summary = SqlAlchemyLessonRepository(db_session).get_summary_for_student(emma.public_id, lesson.public_id)

    assert summary is not None
    assert summary.id == lesson.public_id
    assert summary.material_status is MaterialStatus.COMPLETED
    assert summary.keywords == ("la carta",)
    assert summary.score == Decimal("50")
    assert summary.pdf_filename == lesson.pdf_filename


def test_no_hay_resumen_de_clases_de_otro_estudiante(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
    john = create_student(db_session, teacher=teacher, email="john@correo.com")
    lesson = create_lesson(db_session, student=john, teacher=teacher, date=NOW - timedelta(days=1))

    assert SqlAlchemyLessonRepository(db_session).get_summary_for_student(emma.public_id, lesson.public_id) is None

