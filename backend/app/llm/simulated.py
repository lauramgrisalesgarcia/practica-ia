"""LLM simulado: construye la respuesta del modelo a partir de la petición, sin llamar a ningún proveedor.

Los ejercicios se arman con las palabras clave de la clase (la respuesta correcta de cada uno es una
palabra clave, por turnos), de modo que cumplen las reglas de `material_validation`. Cada frase sale
de un banco de ejemplos por palabra clave (fixtures/example_sentences.json, que cubre las del seed),
con una frase de reserva para las palabras que no estén en él.
Sustituible por un cliente real que implemente `LLMClient` sin tocar el dominio.
"""

import copy
import json
from collections.abc import Mapping, Sequence
from functools import cache
from pathlib import Path
from typing import Any

from app.domain.ports import LLMClient

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
        return copy.deepcopy(_load("recommendations.json"))


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
