from datetime import UTC, datetime
from typing import Any

import pytest

from app.domain.entities import ActivityType, Level, MaterialGenerationRequest
from app.domain.material_validation import parse_generated_material
from app.domain.recommendation_validation import parse_recommendations
from app.llm.simulated import SimulatedLLMClient


def make_request(
    exercise_count: int,
    *,
    topic: str = "Pedir en un restaurante",
    keywords: tuple[str, ...] = ("la carta", "quisiera"),
) -> MaterialGenerationRequest:
    return MaterialGenerationRequest(
        activity_type=ActivityType.COMPLETE_SENTENCE,
        exercise_count=exercise_count,
        student_level=Level.A2,
        native_language="de",
        topic=topic,
        context="Pedir comida y bebida en un restaurante y pedir la cuenta",
        keywords=keywords,
        notes=None,
        pdf_filename="restaurante-a2.pdf",
        pdf_path="lessons/10/restaurante-a2.pdf",
    )


@pytest.mark.parametrize("exercise_count", range(1, 16))
def test_devuelve_un_material_valido_con_la_cantidad_pedida(exercise_count: int) -> None:
    request = make_request(exercise_count)

    response = SimulatedLLMClient().generate_material(request.to_llm_payload())

    material = parse_generated_material(response, request, generated_at=datetime.now(UTC))
    assert material.exercise_count == exercise_count
    assert len(material.exercises) == exercise_count


@pytest.mark.parametrize("exercise_count", [1, 2, 3, 5, 15])
def test_construye_los_ejercicios_con_las_palabras_clave_de_la_clase(exercise_count: int) -> None:
    keywords = ("me llamo", "mi familia", "tengo")
    request = make_request(exercise_count, topic="Presentarse", keywords=keywords)

    response = SimulatedLLMClient().generate_material(request.to_llm_payload())

    material = parse_generated_material(response, request, generated_at=datetime.now(UTC))
    answers = [exercise.correct_option for exercise in material.exercises]
    assert set(answers) <= set(keywords)
    assert len(set(answers)) == min(exercise_count, len(keywords))
    assert "Presentarse" in material.title


def test_no_repite_el_material_de_otra_clase() -> None:
    request = make_request(3, topic="Presentarse", keywords=("me llamo", "mi familia", "tengo"))

    response: Any = SimulatedLLMClient().generate_material(request.to_llm_payload())

    assert "restaurante" not in str(response).lower()


def test_cada_llamada_devuelve_una_copia_independiente() -> None:
    client = SimulatedLLMClient()
    first: Any = client.generate_material(make_request(2).to_llm_payload())
    first["title"] = "modificado"

    second: Any = client.generate_material(make_request(2).to_llm_payload())

    assert second["title"] != "modificado"


def test_devuelve_recomendaciones_validas() -> None:
    response = SimulatedLLMClient().generate_recommendations({"task": "generate_recommendations"})

    feedback, recommendations = parse_recommendations(response)
    assert feedback
    assert 1 <= len(recommendations) <= 5
