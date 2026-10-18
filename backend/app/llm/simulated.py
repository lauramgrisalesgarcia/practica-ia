"""LLM simulado: construye la respuesta del modelo a partir de la petición, sin llamar a ningún proveedor.

Los ejercicios se arman con las palabras clave de la clase (la respuesta correcta de cada uno es una
palabra clave, por turnos), de modo que cumplen las reglas de `material_validation`.
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

# Frases genéricas con un único hueco, válidas para cualquier palabra clave
SENTENCES = (
    "En la clase practicamos esta expresión: «___».",
    "Recuerda usar ___ cuando hables de este tema.",
    "Hoy he repasado ___ con mi docente.",
    "Para practicar, intenta decir ___ en voz alta.",
    "Completa la frase con lo que aprendiste: ___.",
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
        "sentence": SENTENCES[index % len(SENTENCES)],
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


@cache
def _load(name: str) -> dict[str, Any]:
    data: dict[str, Any] = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    return data
