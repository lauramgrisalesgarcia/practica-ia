from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import pytest

from app.domain.entities import ActivityType, Answer, Exercise, LessonContext, Level, Material, Role, Submission
from app.domain.errors import (
    AccessDeniedError,
    InvalidAnswersError,
    InvalidRecommendationsError,
    LessonNotFoundError,
    MaterialNotFoundError,
    SubmissionAlreadyExistsError,
)
from app.domain.use_cases.submit_material import SubmitMaterial
from tests.domain.fakes import (
    FakeLLMClient,
    FixedClock,
    InMemoryLessonRepository,
    InMemoryMaterialRepository,
    make_user,
    uid,
)

NOW = datetime(2026, 10, 12, 18, 5, tzinfo=UTC)
EMMA = make_user(user_id=uid(10), role=Role.ESTUDIANTE)
LESSON_ID = uid(100)
CONTEXT = LessonContext(
    lesson_id=LESSON_ID,
    topic="Pedir en un restaurante",
    context="Pedir comida y bebida en un restaurante y pedir la cuenta",
    keywords=("la carta", "quisiera", "de primero"),
    student_level=Level.A2,
    native_language="de",
)
MATERIAL = Material(
    generated_at=datetime(2026, 10, 12, 10, 30, tzinfo=UTC),
    activity_type=ActivityType.COMPLETE_SENTENCE,
    exercise_count=3,
    title="En el restaurante",
    instructions="Completa cada frase con la opción correcta.",
    exercises=(
        Exercise(id=1, sentence="¿Nos trae ___?", options=("la carta", "la cuenta", "la mesa"), correct_option="la carta"),
        Exercise(id=2, sentence="___ una mesa.", options=("Quisiera", "Quiero que", "Quería que"), correct_option="Quisiera"),
        Exercise(id=3, sentence="___ voy a tomar sopa.", options=("De primero", "Para primero", "En primero"), correct_option="De primero"),
    ),
)
ANSWERS = [Answer(1, "la carta"), Answer(2, "Quisiera"), Answer(3, "Para primero")]
RECOMMENDATIONS = {
    "feedback": "¡Muy bien! Ya sabes pedir la carta.",
    "recommendations": ["Para ordenar los platos se dice 'de primero'.", "Practica un pedido completo."],
}


class Scenario:
    def __init__(
        self,
        *,
        llm: FakeLLMClient | None = None,
        with_material: bool = True,
        previous: Submission | None = None,
    ) -> None:
        self.llm = llm or FakeLLMClient(response=RECOMMENDATIONS)
        self.materials = InMemoryMaterialRepository()
        if with_material:
            self.materials.saved[LESSON_ID] = ({}, MATERIAL)
        if previous:
            self.materials.submissions[LESSON_ID] = previous
        self.use_case = SubmitMaterial(
            lessons=InMemoryLessonRepository(student_contexts={EMMA.id: [CONTEXT]}),
            materials=self.materials,
            llm=self.llm,
            clock=FixedClock(NOW),
        )

    def submit(self, answers: list[Answer] | None = None) -> Any:
        return self.use_case.execute(EMMA, LESSON_ID, ANSWERS if answers is None else answers)


def test_corrige_guarda_y_devuelve_el_resultado_con_recomendaciones() -> None:
    scenario = Scenario()

    result = scenario.submit()

    expected = Submission(
        submitted_at=NOW,
        answers=tuple(ANSWERS),
        correct_count=2,
        incorrect_count=1,
        score=Decimal("66.67"),
        feedback="¡Muy bien! Ya sabes pedir la carta.",
        recommendations=("Para ordenar los platos se dice 'de primero'.", "Practica un pedido completo."),
    )
    assert result.submission == expected
    assert scenario.materials.submissions[LESSON_ID] == expected
    assert [item.is_correct for item in result.grade.results] == [True, True, False]


def test_pide_las_recomendaciones_con_el_contexto_y_solo_los_ejercicios_fallados() -> None:
    scenario = Scenario()

    scenario.submit()

    assert scenario.llm.requests == [
        {
            "task": "generate_recommendations",
            "student": {"level": "A2", "native_language": "de"},
            "lesson": {
                "topic": "Pedir en un restaurante",
                "context": "Pedir comida y bebida en un restaurante y pedir la cuenta",
                "keywords": ["la carta", "quisiera", "de primero"],
            },
            "result": {
                "correct_count": 2,
                "incorrect_count": 1,
                "score": 66.67,
                "failed_exercises": [
                    {
                        "sentence": "___ voy a tomar sopa.",
                        "selected_option": "Para primero",
                        "correct_option": "De primero",
                    }
                ],
            },
            "output_language": "es",
        }
    ]


INVALID_ANSWERS = {
    "falta un ejercicio": [Answer(1, "la carta"), Answer(2, "Quisiera")],
    "ejercicio repetido": [Answer(1, "la carta"), Answer(1, "la mesa"), Answer(2, "Quisiera"), Answer(3, "De primero")],
    "ejercicio inexistente": [Answer(1, "la carta"), Answer(2, "Quisiera"), Answer(9, "De primero")],
    "opción inexistente": [Answer(1, "la carta"), Answer(2, "Quisiera"), Answer(3, "De segundo")],
    "sin respuestas": [],
}


@pytest.mark.parametrize("answers", list(INVALID_ANSWERS.values()), ids=list(INVALID_ANSWERS))
def test_rechaza_respuestas_incompletas_o_invalidas_sin_consumir_el_intento(answers: list[Answer]) -> None:
    scenario = Scenario()

    with pytest.raises(InvalidAnswersError):
        scenario.submit(answers)

    assert scenario.llm.requests == []
    assert scenario.materials.submissions == {}


def test_solo_se_puede_resolver_una_vez() -> None:
    previous = Submission(
        submitted_at=NOW,
        answers=tuple(ANSWERS),
        correct_count=2,
        incorrect_count=1,
        score=Decimal("66.67"),
        feedback="Anterior",
        recommendations=("Anterior",),
    )
    scenario = Scenario(previous=previous)

    with pytest.raises(SubmissionAlreadyExistsError):
        scenario.submit()

    assert scenario.llm.requests == []
    assert scenario.materials.submissions[LESSON_ID] == previous


INVALID_RECOMMENDATIONS = {
    "no es un objeto": ["recomendación"],
    "sin comentario": {"feedback": "", "recommendations": ["Repasa."]},
    "sin recomendaciones": {"feedback": "Bien", "recommendations": []},
    "seis recomendaciones": {"feedback": "Bien", "recommendations": [f"r{n}" for n in range(6)]},
    "recomendación vacía": {"feedback": "Bien", "recommendations": ["Repasa.", "  "]},
    "recomendaciones no es una lista": {"feedback": "Bien", "recommendations": "Repasa."},
}


@pytest.mark.parametrize("response", list(INVALID_RECOMMENDATIONS.values()), ids=list(INVALID_RECOMMENDATIONS))
def test_recomendaciones_invalidas_no_consumen_el_intento(response: object) -> None:
    scenario = Scenario(llm=FakeLLMClient(response=response))

    with pytest.raises(InvalidRecommendationsError):
        scenario.submit()

    assert scenario.materials.submissions == {}


def test_si_el_llm_falla_no_se_consume_el_intento() -> None:
    scenario = Scenario(llm=FakeLLMClient(error=RuntimeError("sin conexión")))

    with pytest.raises(InvalidRecommendationsError):
        scenario.submit()

    assert scenario.materials.submissions == {}


def test_una_clase_sin_material() -> None:
    with pytest.raises(MaterialNotFoundError):
        Scenario(with_material=False).submit()


def test_una_clase_de_otro_estudiante_no_se_encuentra() -> None:
    scenario = Scenario()

    with pytest.raises(LessonNotFoundError):
        scenario.use_case.execute(make_user(user_id=uid(11), role=Role.ESTUDIANTE), LESSON_ID, ANSWERS)


def test_un_docente_no_puede_resolver_el_material() -> None:
    scenario = Scenario()

    with pytest.raises(AccessDeniedError):
        scenario.use_case.execute(make_user(user_id=uid(1), role=Role.DOCENTE), LESSON_ID, ANSWERS)
