import copy
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from app.domain.entities import ActivityType, Exercise, GenerationContext, Level, Role
from app.domain.errors import (
    AccessDeniedError,
    InvalidLLMResponseError,
    LessonNotCompletedError,
    LessonNotFoundError,
    MaterialAlreadyGeneratedError,
)
from app.domain.use_cases.generate_material import GenerateMaterial
from tests.domain.fakes import (
    FakeLLMClient,
    FixedClock,
    InMemoryLessonRepository,
    InMemoryMaterialRepository,
    make_user,
    uid,
)

NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)
TEACHER = make_user(user_id=uid(1), role=Role.DOCENTE)
LESSON_ID = uid(100)


def make_context(**overrides: Any) -> GenerationContext:
    values: dict[str, Any] = {
        "lesson_id": LESSON_ID,
        "date": NOW - timedelta(days=4),
        "topic": "Pedir en un restaurante",
        "context": "Pedir comida y bebida en un restaurante y pedir la cuenta",
        "keywords": ("la carta", "quisiera", "para beber"),
        "notes": "Confunde 'quiero' y 'quisiera'.",
        "pdf_filename": "restaurante-a2.pdf",
        "pdf_path": "lessons/10/restaurante-a2.pdf",
        "student_level": Level.A2,
        "native_language": "de",
        "has_material": False,
    }
    return GenerationContext(**(values | overrides))


def llm_response(count: int) -> dict[str, Any]:
    return {
        "activity_type": "complete_sentence",
        "title": "En el restaurante",
        "instructions": "Completa cada frase con la opción correcta.",
        "exercises": [
            {
                "id": n,
                "sentence": f"Frase número {n} con ___ hueco.",
                "options": ["un", "una", "unos"],
                "correct_option": "un",
            }
            for n in range(1, count + 1)
        ],
    }


class Scenario:
    def __init__(self, context: GenerationContext | None = None, llm: FakeLLMClient | None = None) -> None:
        self.llm = llm or FakeLLMClient(response=llm_response(3))
        self.materials = InMemoryMaterialRepository()
        contexts = [context or make_context()]
        self.use_case = GenerateMaterial(
            lessons=InMemoryLessonRepository(contexts_by_teacher={TEACHER.id: contexts}),
            materials=self.materials,
            llm=self.llm,
            clock=FixedClock(NOW),
        )

    def generate(self, *, exercise_count: int = 3, keywords: list[str] | None = None) -> Any:
        return self.use_case.execute(
            TEACHER,
            LESSON_ID,
            activity_type=ActivityType.COMPLETE_SENTENCE,
            exercise_count=exercise_count,
            keywords=keywords,
        )


def test_genera_y_guarda_el_material() -> None:
    scenario = Scenario()

    material = scenario.generate()

    assert material.generated_at == NOW
    assert material.activity_type is ActivityType.COMPLETE_SENTENCE
    assert material.exercise_count == 3
    assert material.title == "En el restaurante"
    assert material.exercises[0] == Exercise(
        id=1, sentence="Frase número 1 con ___ hueco.", options=("un", "una", "unos"), correct_option="un"
    )
    assert scenario.materials.saved[LESSON_ID][1] == material


def test_envia_al_llm_el_contexto_completo_de_la_clase() -> None:
    scenario = Scenario()

    scenario.generate()

    assert scenario.llm.requests == [
        {
            "task": "generate_reinforcement_material",
            "activity_type": "complete_sentence",
            "exercise_count": 3,
            "student": {"level": "A2", "native_language": "de"},
            "lesson": {
                "topic": "Pedir en un restaurante",
                "context": "Pedir comida y bebida en un restaurante y pedir la cuenta",
                "keywords": ["la carta", "quisiera", "para beber"],
                "notes": "Confunde 'quiero' y 'quisiera'.",
                "pdf": {"filename": "restaurante-a2.pdf", "path": "lessons/10/restaurante-a2.pdf"},
            },
            "output_language": "es",
        }
    ]


def test_guarda_la_peticion_enviada_al_llm() -> None:
    scenario = Scenario()

    scenario.generate()

    assert scenario.materials.saved[LESSON_ID][0] == scenario.llm.requests[0]


def test_usa_las_palabras_clave_revisadas_sin_espacios_sobrantes_ni_duplicados() -> None:
    scenario = Scenario()

    scenario.generate(keywords=["  la carta ", "de segundo", "La Carta", "de segundo", "la cuenta"])

    assert scenario.llm.requests[0]["lesson"]["keywords"] == ["la carta", "de segundo", "la cuenta"]


def test_no_genera_material_para_una_clase_futura() -> None:
    scenario = Scenario(context=make_context(date=NOW + timedelta(days=1)))

    with pytest.raises(LessonNotCompletedError):
        scenario.generate()

    assert scenario.llm.requests == []


def test_el_material_se_genera_una_unica_vez() -> None:
    scenario = Scenario(context=make_context(has_material=True))

    with pytest.raises(MaterialAlreadyGeneratedError):
        scenario.generate()

    assert scenario.llm.requests == []
    assert scenario.materials.saved == {}


def test_una_clase_de_otro_docente_no_se_encuentra() -> None:
    scenario = Scenario()

    with pytest.raises(LessonNotFoundError):
        scenario.use_case.execute(
            make_user(user_id=uid(2), role=Role.DOCENTE),
            LESSON_ID,
            activity_type=ActivityType.COMPLETE_SENTENCE,
            exercise_count=3,
            keywords=None,
        )


def test_un_estudiante_no_puede_generar_material() -> None:
    scenario = Scenario()

    with pytest.raises(AccessDeniedError):
        scenario.use_case.execute(
            make_user(user_id=uid(10), role=Role.ESTUDIANTE),
            LESSON_ID,
            activity_type=ActivityType.COMPLETE_SENTENCE,
            exercise_count=3,
            keywords=None,
        )


def broken(change: Any) -> dict[str, Any]:
    response = copy.deepcopy(llm_response(3))
    change(response)
    return response


INVALID_RESPONSES = {
    "no es un objeto": ["no", "es", "un", "objeto"],
    "menos ejercicios de los pedidos": llm_response(2),
    "más ejercicios de los pedidos": llm_response(4),
    "otro tipo de actividad": broken(lambda r: r.update(activity_type="multiple_choice")),
    "sin título": broken(lambda r: r.update(title="")),
    "sin instrucciones": broken(lambda r: r.pop("instructions")),
    "ejercicios no es una lista": broken(lambda r: r.update(exercises="nada")),
    "frase sin hueco": broken(lambda r: r["exercises"][0].update(sentence="Frase sin hueco.")),
    "frase con dos huecos": broken(lambda r: r["exercises"][0].update(sentence="___ y ___")),
    "una sola opción": broken(lambda r: r["exercises"][0].update(options=["un"], correct_option="un")),
    "cinco opciones": broken(lambda r: r["exercises"][0].update(options=["a", "b", "c", "d", "e"], correct_option="a")),
    "opciones repetidas": broken(lambda r: r["exercises"][0].update(options=["un", "un"])),
    "opción vacía": broken(lambda r: r["exercises"][0].update(options=["un", " "])),
    "respuesta fuera de las opciones": broken(lambda r: r["exercises"][0].update(correct_option="otra")),
    "ids repetidos": broken(lambda r: r["exercises"][1].update(id=1)),
    "id no entero": broken(lambda r: r["exercises"][0].update(id="1")),
}


@pytest.mark.parametrize("response", list(INVALID_RESPONSES.values()), ids=list(INVALID_RESPONSES))
def test_rechaza_una_respuesta_invalida_del_llm_sin_guardar_nada(response: object) -> None:
    scenario = Scenario(llm=FakeLLMClient(response=response))

    with pytest.raises(InvalidLLMResponseError):
        scenario.generate(exercise_count=3)

    assert scenario.materials.saved == {}


def test_si_el_llm_falla_se_informa_como_respuesta_invalida() -> None:
    scenario = Scenario(llm=FakeLLMClient(error=RuntimeError("tiempo de espera agotado")))

    with pytest.raises(InvalidLLMResponseError):
        scenario.generate()

    assert scenario.materials.saved == {}
