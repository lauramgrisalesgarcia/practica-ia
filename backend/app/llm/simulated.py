"""LLM simulado: responde con un JSON fijo que imita la respuesta del modelo.

Sustituible por un cliente real que implemente `LLMClient` sin tocar el dominio.
"""

import copy
import json
from collections.abc import Mapping
from functools import cache
from pathlib import Path
from typing import Any

from app.domain.ports import LLMClient

FIXTURES = Path(__file__).parent / "fixtures"


class SimulatedLLMClient(LLMClient):
    def generate_material(self, request: Mapping[str, Any]) -> object:
        response = copy.deepcopy(_load("reinforcement_material.json"))
        # El fixture trae 15 ejercicios: se devuelven tantos como se pidan.
        response["exercises"] = response["exercises"][: int(request["exercise_count"])]
        return response

    def generate_recommendations(self, request: Mapping[str, Any]) -> object:
        return copy.deepcopy(_load("recommendations.json"))


@cache
def _load(name: str) -> dict[str, Any]:
    data: dict[str, Any] = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    return data
