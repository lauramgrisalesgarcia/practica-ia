from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.domain.entities import ActivityType, Answer, Exercise, Material, Role, Submission
from app.domain.errors import AccessDeniedError, LessonNotFoundError, MaterialNotFoundError
from app.domain.use_cases.get_my_material import GetMyMaterial
from tests.domain.fakes import InMemoryLessonRepository, InMemoryMaterialRepository, make_user, uid

EMMA = make_user(user_id=uid(10), role=Role.ESTUDIANTE)
LESSON_ID = uid(100)
MATERIAL = Material(
    generated_at=datetime(2026, 10, 12, tzinfo=UTC),
    activity_type=ActivityType.COMPLETE_SENTENCE,
    exercise_count=2,
    title="En el restaurante",
    instructions="Completa cada frase.",
    exercises=(
        Exercise(id=1, sentence="¿Nos trae ___?", options=("la carta", "la mesa"), correct_option="la carta"),
        Exercise(id=2, sentence="___ una mesa.", options=("Quisiera", "Quiero que"), correct_option="Quisiera"),
    ),
)
SUBMISSION = Submission(
    submitted_at=datetime(2026, 10, 12, 18, 5, tzinfo=UTC),
    answers=(Answer(1, "la carta"), Answer(2, "Quiero que")),
    correct_count=1,
    incorrect_count=1,
    score=Decimal("50.00"),
    feedback="¡Bien! Repasa 'quisiera'.",
    recommendations=("Usa 'quisiera' para pedir con cortesía.",),
)


def build(*, material: bool = True, submission: Submission | None = None) -> GetMyMaterial:
    materials = InMemoryMaterialRepository()
    if material:
        materials.saved[LESSON_ID] = ({}, MATERIAL)
        if submission:
            materials.submissions[LESSON_ID] = submission
    return GetMyMaterial(
        lessons=InMemoryLessonRepository(lessons_by_student={EMMA.id: {LESSON_ID}}),
        materials=materials,
    )


def test_devuelve_el_material_sin_resultado_si_aun_no_lo_resolvio() -> None:
    view = build().execute(EMMA, LESSON_ID)

    assert view.lesson_id == LESSON_ID
    assert view.material == MATERIAL
    assert view.submission is None
    assert view.grade is None


def test_si_ya_lo_resolvio_incluye_su_resultado_corregido() -> None:
    view = build(submission=SUBMISSION).execute(EMMA, LESSON_ID)

    assert view.submission == SUBMISSION
    assert view.grade is not None
    assert [result.is_correct for result in view.grade.results] == [True, False]
    assert view.grade.results[1].correct_option == "Quisiera"


def test_una_clase_sin_material() -> None:
    with pytest.raises(MaterialNotFoundError):
        build(material=False).execute(EMMA, LESSON_ID)


def test_una_clase_de_otro_estudiante_no_se_encuentra() -> None:
    with pytest.raises(LessonNotFoundError):
        build().execute(make_user(user_id=uid(11), role=Role.ESTUDIANTE), LESSON_ID)


def test_un_docente_no_usa_la_vista_del_estudiante() -> None:
    with pytest.raises(AccessDeniedError):
        build().execute(make_user(user_id=uid(1), role=Role.DOCENTE), LESSON_ID)
