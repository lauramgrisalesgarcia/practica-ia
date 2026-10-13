from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.domain.entities import ActivityType, Answer, Exercise, Level, Material, Submission
from app.domain.errors import SubmissionAlreadyExistsError
from app.persistence.models import ReinforcementMaterialModel
from app.persistence.repositories.lesson_repository import SqlAlchemyLessonRepository
from app.persistence.repositories.material_repository import SqlAlchemyMaterialRepository
from tests.factories import create_lesson, create_material, create_student, create_submission, create_user

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def make_material(title: str, count: int = 2) -> Material:
    return Material(
        generated_at=NOW,
        activity_type=ActivityType.COMPLETE_SENTENCE,
        exercise_count=count,
        title=title,
        instructions="Completa cada frase.",
        exercises=tuple(
            Exercise(id=n, sentence=f"Frase ___ {n}", options=("a", "b"), correct_option="a")
            for n in range(1, count + 1)
        ),
    )


def test_guarda_el_material_y_la_peticion_al_llm(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))

    SqlAlchemyMaterialRepository(db_session).save(lesson.public_id, {"task": "generar"}, make_material("Primero"))

    detail = SqlAlchemyLessonRepository(db_session).get_detail_for_teacher(teacher.public_id, lesson.public_id)
    assert detail is not None
    assert detail.material == make_material("Primero")
    model = db_session.scalar(select(ReinforcementMaterialModel))
    assert model is not None
    assert model.llm_request == {"task": "generar"}


def test_regenerar_reemplaza_el_material_anterior(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    repository = SqlAlchemyMaterialRepository(db_session)

    repository.save(lesson.public_id, {"version": 1}, make_material("Primero"))
    repository.save(lesson.public_id, {"version": 2}, make_material("Segundo", count=3))

    assert db_session.scalar(select(func.count()).select_from(ReinforcementMaterialModel)) == 1
    detail = SqlAlchemyLessonRepository(db_session).get_detail_for_teacher(teacher.public_id, lesson.public_id)
    assert detail is not None
    assert detail.material == make_material("Segundo", count=3)


def test_contexto_de_generacion_de_una_clase(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher, native_language="de", level=Level.A2)
    lesson = create_lesson(
        db_session,
        student=emma,
        teacher=teacher,
        date=NOW - timedelta(days=4),
        keywords=["la carta", "quisiera"],
        notes="Confunde quiero y quisiera.",
    )

    context = SqlAlchemyLessonRepository(db_session).get_generation_context_for_teacher(
        teacher.public_id, lesson.public_id
    )

    assert context is not None
    assert context.lesson_id == lesson.public_id
    assert context.date == lesson.date
    assert context.keywords == ("la carta", "quisiera")
    assert context.notes == "Confunde quiero y quisiera."
    assert context.pdf_path == lesson.pdf_path
    assert context.student_level is Level.A2
    assert context.native_language == "de"
    assert context.has_submission is False


def test_el_contexto_indica_si_el_material_ya_fue_resuelto(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=4))
    create_submission(db_session, material=create_material(db_session, lesson=lesson), student=emma)

    context = SqlAlchemyLessonRepository(db_session).get_generation_context_for_teacher(
        teacher.public_id, lesson.public_id
    )

    assert context is not None
    assert context.has_submission is True


def test_no_hay_contexto_para_clases_de_otro_docente(db_session: Session) -> None:
    teacher = create_user(db_session, email="docente@colegio.edu")
    other_teacher = create_user(db_session, email="otro@colegio.edu")
    pierre = create_student(db_session, teacher=other_teacher, email="pierre@correo.com")
    lesson = create_lesson(db_session, student=pierre, teacher=other_teacher, date=NOW)
    repository = SqlAlchemyLessonRepository(db_session)

    assert repository.get_generation_context_for_teacher(teacher.public_id, lesson.public_id) is None
    assert repository.get_generation_context_for_teacher(teacher.public_id, uuid4()) is None


def test_obtiene_el_material_de_una_clase_sin_resolver(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    create_material(db_session, lesson=lesson, exercise_count=2)

    found = SqlAlchemyMaterialRepository(db_session).get_for_lesson(lesson.public_id)

    assert found is not None
    material, submission = found
    assert material.exercise_count == 2
    assert submission is None


def test_obtiene_el_intento_del_estudiante(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    material = create_material(db_session, lesson=lesson, exercise_count=2)
    model = create_submission(
        db_session,
        material=material,
        student=emma,
        answers=[{"exercise_id": 1, "selected_option": "a"}, {"exercise_id": 2, "selected_option": "b"}],
        correct_count=1,
        incorrect_count=1,
        score=Decimal("50.00"),
    )

    found = SqlAlchemyMaterialRepository(db_session).get_for_lesson(lesson.public_id)

    assert found is not None
    _, submission = found
    assert submission == Submission(
        submitted_at=model.submitted_at,
        answers=(Answer(1, "a"), Answer(2, "b")),
        correct_count=1,
        incorrect_count=1,
        score=Decimal("50.00"),
        feedback="¡Muy bien!",
        recommendations=("Sigue así.",),
    )


def test_no_hay_material_para_una_clase_sin_material(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW)

    assert SqlAlchemyMaterialRepository(db_session).get_for_lesson(lesson.public_id) is None


def test_comprueba_si_una_clase_es_del_estudiante(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher, email="emma@correo.com")
    john = create_student(db_session, teacher=teacher, email="john@correo.com")
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW)
    repository = SqlAlchemyLessonRepository(db_session)

    assert repository.exists_for_student(emma.public_id, lesson.public_id) is True
    assert repository.exists_for_student(john.public_id, lesson.public_id) is False
    assert repository.exists_for_student(emma.public_id, uuid4()) is False


def make_submission() -> Submission:
    return Submission(
        submitted_at=NOW,
        answers=(Answer(1, "a"), Answer(2, "b")),
        correct_count=1,
        incorrect_count=1,
        score=Decimal("50.00"),
        feedback="¡Bien!",
        recommendations=("Repasa el ejercicio 2.",),
    )


def test_guarda_el_intento_del_estudiante(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    create_material(db_session, lesson=lesson, exercise_count=2)
    repository = SqlAlchemyMaterialRepository(db_session)

    repository.save_submission(lesson.public_id, emma.public_id, make_submission())

    found = repository.get_for_lesson(lesson.public_id)
    assert found is not None
    assert found[1] == make_submission()


def test_un_segundo_intento_viola_la_restriccion_unica(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW - timedelta(days=1))
    create_material(db_session, lesson=lesson, exercise_count=2)
    repository = SqlAlchemyMaterialRepository(db_session)
    repository.save_submission(lesson.public_id, emma.public_id, make_submission())

    with pytest.raises(SubmissionAlreadyExistsError):
        repository.save_submission(lesson.public_id, emma.public_id, make_submission())

    found = repository.get_for_lesson(lesson.public_id)
    assert found is not None
    assert found[1] == make_submission()


def test_contexto_de_una_clase_del_estudiante(db_session: Session) -> None:
    teacher = create_user(db_session)
    emma = create_student(db_session, teacher=teacher, email="emma@correo.com", native_language="de", level=Level.A2)
    john = create_student(db_session, teacher=teacher, email="john@correo.com")
    lesson = create_lesson(db_session, student=emma, teacher=teacher, date=NOW, keywords=["la carta", "quisiera"])
    repository = SqlAlchemyLessonRepository(db_session)

    context = repository.get_context_for_student(emma.public_id, lesson.public_id)

    assert context is not None
    assert context.lesson_id == lesson.public_id
    assert context.topic == lesson.topic
    assert context.keywords == ("la carta", "quisiera")
    assert context.student_level is Level.A2
    assert context.native_language == "de"
    assert repository.get_context_for_student(john.public_id, lesson.public_id) is None
