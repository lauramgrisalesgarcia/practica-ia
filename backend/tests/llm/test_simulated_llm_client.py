from datetime import UTC, datetime
from typing import Any

import pytest

from app.domain.entities import ActivityType, Level, MaterialGenerationRequest
from app.domain.material_validation import parse_generated_material
from app.domain.recommendation_validation import parse_recommendations
from app.llm.simulated import SimulatedLLMClient, example_sentences
from app.persistence.seed import LESSONS, _LessonSeed


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


SEED_KEYWORDS = sorted({keyword for lesson in LESSONS for keyword in lesson.keywords})


@pytest.mark.parametrize("keyword", SEED_KEYWORDS)
def test_cada_palabra_clave_del_seed_tiene_frases_de_ejemplo_para_practicarla(keyword: str) -> None:
    sentences = example_sentences(keyword)

    assert len(sentences) >= 2
    assert all(sentence.count("___") == 1 for sentence in sentences)


@pytest.mark.parametrize("lesson", LESSONS, ids=lambda lesson: lesson.topic)
def test_las_frases_de_una_clase_del_seed_salen_del_banco_de_ejemplos(lesson: _LessonSeed) -> None:
    request = make_request(8, topic=lesson.topic, keywords=lesson.keywords)

    response: Any = SimulatedLLMClient().generate_material(request.to_llm_payload())

    for exercise in response["exercises"]:
        assert exercise["sentence"] in example_sentences(exercise["correct_option"])


def test_una_palabra_clave_repetida_se_practica_con_frases_distintas() -> None:
    request = make_request(4, keywords=("la carta", "quisiera"))

    response: Any = SimulatedLLMClient().generate_material(request.to_llm_payload())

    sentences = [exercise["sentence"] for exercise in response["exercises"]]
    assert len(set(sentences)) == 4


def test_reconoce_la_palabra_clave_aunque_cambien_mayusculas_o_espacios() -> None:
    assert example_sentences("  La   Carta ") == example_sentences("la carta")


def test_una_palabra_clave_sin_ejemplos_usa_una_frase_con_hueco() -> None:
    request = make_request(2, keywords=("palabra inventada", "otra inventada"))

    response: Any = SimulatedLLMClient().generate_material(request.to_llm_payload())

    assert all(exercise["sentence"].count("___") == 1 for exercise in response["exercises"])


def test_cada_llamada_devuelve_una_copia_independiente() -> None:
    client = SimulatedLLMClient()
    first: Any = client.generate_material(make_request(2).to_llm_payload())
    first["title"] = "modificado"

    second: Any = client.generate_material(make_request(2).to_llm_payload())

    assert second["title"] != "modificado"


def recommendations_request(failed: list[tuple[str, str, str]], total: int = 4) -> dict[str, Any]:
    """Petición como la de submit_material; failed = (frase, elegida, correcta)."""
    return {
        "task": "generate_recommendations",
        "student": {"level": "A2", "native_language": "de"},
        "lesson": {
            "topic": "La rutina diaria",
            "context": "Contar lo que hace en un día normal",
            "keywords": ["me levanto", "desayuno", "por la tarde", "me acuesto"],
        },
        "result": {
            "correct_count": total - len(failed),
            "incorrect_count": len(failed),
            "score": round(10 * (total - len(failed)) / total, 2),
            "failed_exercises": [
                {"sentence": sentence, "selected_option": selected, "correct_option": correct}
                for sentence, selected, correct in failed
            ],
        },
        "output_language": "es",
    }


FAILED = [
    ("Todos los días ___ a las siete y me ducho.", "desayuno", "me levanto"),
    ("Estoy muy cansada, así que hoy ___ temprano.", "por la tarde", "me acuesto"),
]


@pytest.mark.parametrize("failed", [[], FAILED[:1], FAILED, FAILED * 3], ids=["todo bien", "uno", "dos", "muchos"])
def test_devuelve_recomendaciones_validas(failed: list[tuple[str, str, str]]) -> None:
    response = SimulatedLLMClient().generate_recommendations(recommendations_request(failed, total=max(4, len(failed))))

    feedback, recommendations = parse_recommendations(response)
    assert feedback
    assert 1 <= len(recommendations) <= 5


def test_las_recomendaciones_hablan_de_la_clase_y_no_de_otra() -> None:
    response = SimulatedLLMClient().generate_recommendations(recommendations_request(FAILED))

    feedback, recommendations = parse_recommendations(response)
    text = " ".join([feedback, *recommendations])
    assert "La rutina diaria" in text
    assert "restaurante" not in text.lower()
    assert "quisiera" not in text


def test_recomienda_repasar_cada_palabra_fallada_con_la_frase_corregida() -> None:
    response = SimulatedLLMClient().generate_recommendations(recommendations_request(FAILED))

    feedback, recommendations = parse_recommendations(response)
    assert any("me levanto" in item and "Todos los días me levanto a las siete" in item for item in recommendations)
    assert any("me acuesto" in item and "«por la tarde»" in item for item in recommendations)
    assert "2 de 4" in feedback


def test_sin_fallos_felicita_y_propone_seguir_practicando_las_palabras_clave() -> None:
    response = SimulatedLLMClient().generate_recommendations(recommendations_request([]))

    feedback, recommendations = parse_recommendations(response)
    assert "4 de 4" in feedback
    assert any("me levanto" in item for item in recommendations)


def test_no_repite_la_recomendacion_de_una_misma_palabra_fallada_varias_veces() -> None:
    response = SimulatedLLMClient().generate_recommendations(recommendations_request(FAILED * 3, total=6))

    _, recommendations = parse_recommendations(response)
    assert sum("Repasa «me levanto»" in item for item in recommendations) == 1
