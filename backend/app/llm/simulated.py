"""LLM simulado: construye la respuesta del modelo a partir de la petición, sin llamar a ningún proveedor.

Los ejercicios se arman con las palabras clave de la clase (la respuesta correcta de cada uno es una
palabra clave, por turnos), de modo que cumplen las reglas de `material_validation`. Cada frase sale
de un banco de ejemplos por palabra clave (fixtures/example_sentences.json, que cubre las del seed),
con una frase de reserva para las palabras que no estén en él. Las recomendaciones se arman con el
tema, las palabras clave y los ejercicios fallados que llegan en la petición.
Sustituible por un cliente real que implemente `LLMClient` sin tocar el dominio.
"""

import json
from collections.abc import Mapping, Sequence
from functools import cache
from pathlib import Path
from typing import Any

from app.domain.ports import LLMClient
from app.domain.recommendation_validation import MAX_RECOMMENDATIONS

FIXTURES = Path(__file__).parent / "fixtures"

# Frases de reserva para palabras clave sin ejemplos en fixtures/example_sentences.json
FALLBACK_SENTENCES = (
    "En la clase practicamos esta expresión: «___».",
    "Escribe la palabra o expresión de la clase que falta: ___.",
)
# Distractores de reserva cuando no hay otras palabras clave suficientes
FILLERS = ("por favor", "gracias", "hasta luego", "de nada")
OPTIONS_PER_EXERCISE = 3


class SimulatedLLMClient(LLMClient):
    def generate_material(self, request: Mapping[str, Any]) -> object:
        lesson = request["lesson"]
        keywords: list[str] = list(lesson["keywords"])
        count = int(request["exercise_count"])
        return {
            "activity_type": request["activity_type"],
            "title": f"Refuerzo: {lesson['topic']}",
            "instructions": "Completa cada frase con la palabra o expresión correcta.",
            "exercises": [_exercise(index, keywords) for index in range(count)],
        }

    def generate_recommendations(self, request: Mapping[str, Any]) -> object:
        lesson = request["lesson"]
        result = request["result"]
        topic = lesson["topic"]
        keywords = _quoted(lesson["keywords"])
        total = result["correct_count"] + result["incorrect_count"]
        hits = f"{result['correct_count']} de {total}"

        # Una recomendación por palabra fallada (sin repetir), con la frase corregida
        recommendations: list[str] = []
        reviewed: set[str] = set()
        for failed in result["failed_exercises"]:
            correct = failed["correct_option"]
            if correct in reviewed or len(recommendations) == MAX_RECOMMENDATIONS - 1:
                continue
            reviewed.add(correct)
            fixed = failed["sentence"].replace("___", correct)
            recommendations.append(
                f"Repasa «{correct}»: en «{fixed}» va «{correct}», no «{failed['selected_option']}»."
            )

        if not recommendations:
            feedback = f"¡Excelente! Acertaste {hits} en «{topic}»: ya dominas {keywords}."
            recommendations.append(f"Para seguir avanzando, escribe frases propias con {keywords}.")
        elif result["correct_count"] == 0:
            feedback = f"Acertaste {hits} en «{topic}». No te desanimes: repasa la clase y vuelve a intentarlo."
        else:
            feedback = f"¡Buen trabajo! Acertaste {hits} en «{topic}». Repasa las expresiones que fallaste."
        recommendations.append(f"Practica en voz alta situaciones de «{topic}» usando {keywords}.")
        return {"feedback": feedback, "recommendations": recommendations}


def _exercise(index: int, keywords: Sequence[str]) -> dict[str, Any]:
    answer = keywords[index % len(keywords)]
    options = [answer, *_distractors(answer, keywords)]
    # La respuesta correcta cambia de posición para no estar siempre la primera
    shift = index % len(options)
    options = options[shift:] + options[:shift]
    return {
        "id": index + 1,
        # Si la palabra se repite, cada vuelta usa otra frase de ejemplo
        "sentence": _pick(example_sentences(answer) or FALLBACK_SENTENCES, index // len(keywords)),
        "options": options,
        "correct_option": answer,
    }


def _distractors(answer: str, keywords: Sequence[str]) -> list[str]:
    used = {answer.casefold()}
    result: list[str] = []
    for candidate in [*keywords, *FILLERS]:
        if len(result) == OPTIONS_PER_EXERCISE - 1:
            break
        if candidate.casefold() not in used:
            used.add(candidate.casefold())
            result.append(candidate)
    return result


def example_sentences(keyword: str) -> tuple[str, ...]:
    """Frases con un hueco («___») para practicar la palabra clave; vacío si no hay ejemplos."""
    return _sentence_bank().get(_normalize(keyword), ())


def _quoted(words: Sequence[str]) -> str:
    """«a», «b» y «c»"""
    items = [f"«{word}»" for word in words]
    return items[0] if len(items) == 1 else f"{', '.join(items[:-1])} y {items[-1]}"


def _pick(sentences: Sequence[str], turn: int) -> str:
    return sentences[turn % len(sentences)]


def _normalize(text: str) -> str:
    return " ".join(text.split()).casefold()


@cache
def _sentence_bank() -> dict[str, tuple[str, ...]]:
    return {_normalize(keyword): tuple(sentences) for keyword, sentences in _load("example_sentences.json").items()}


@cache
def _load(name: str) -> dict[str, Any]:
    data: dict[str, Any] = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    return data
