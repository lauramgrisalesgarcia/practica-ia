from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.domain.entities import ActivityType, Answer, Exercise, Material, Role, Submission
from app.domain.errors import AccessDeniedError, LessonNotFoundError, MaterialNotFoundError, SubmissionNotFoundError
from app.domain.use_cases.get_my_submission import GetMySubmission
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


def build(*, material: bool = True, submission: Submission | None = SUBMISSION) -> GetMySubmission:
    materials = InMemoryMaterialRepository()
    if material:
        materials.saved[LESSON_ID] = ({}, MATERIAL)
        if submission:
            materials.submissions[LESSON_ID] = submission
    return GetMySubmission(
        lessons=InMemoryLessonRepository(lessons_by_student={EMMA.id: {LESSON_ID}}),
        materials=materials,
    )


def test_devuelve_mi_resultado_corregido() -> None:
    result = build().execute(EMMA, LESSON_ID)

    assert result.lesson_id == LESSON_ID
    assert result.submission == SUBMISSION
    assert [item.is_correct for item in result.grade.results] == [True, False]
    assert result.grade.results[1].correct_option == "Quisiera"


def test_si_aun_no_lo_resolvio() -> None:
    with pytest.raises(SubmissionNotFoundError):
        build(submission=None).execute(EMMA, LESSON_ID)


def test_una_clase_sin_material() -> None:
    with pytest.raises(MaterialNotFoundError):
        build(material=False).execute(EMMA, LESSON_ID)


def test_una_clase_de_otro_estudiante_no_se_encuentra() -> None:
    with pytest.raises(LessonNotFoundError):
        build().execute(make_user(user_id=uid(11), role=Role.ESTUDIANTE), LESSON_ID)


def test_un_docente_no_usa_la_vista_del_estudiante() -> None:
    with pytest.raises(AccessDeniedError):
        build().execute(make_user(user_id=uid(1), role=Role.DOCENTE), LESSON_ID)
