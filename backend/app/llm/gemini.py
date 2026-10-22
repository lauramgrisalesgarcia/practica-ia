"""Cliente real del LLM: Gemini (API de Google AI Studio). Implementa el puerto `LLMClient`.

El dominio construye la petición (`MaterialGenerationRequest.to_llm_payload()`); este adaptador la
envía como prompt y devuelve el JSON que responde el modelo, sin validarlo: la validación la hace el dominio.
"""

import json
import urllib.request
from collections.abc import Mapping
from typing import Any, Protocol

from app.domain.ports import LLMClient

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
API_KEY_HEADER = "x-goog-api-key"
TIMEOUT_SECONDS = 60

GENERATE_MATERIAL_INSTRUCTIONS = (
    "Eres un profesor de español para extranjeros. Crea material de refuerzo a partir de los datos de la clase. "
    "Responde solo con JSON, en español, con la forma: "
    '{"activity_type", "title", "instructions", "exercises": [{"id", "sentence", "options", "correct_option"}]}. '
    "Cada frase lleva exactamente un hueco «___». Cada ejercicio tiene tres opciones; la correcta es una "
    "palabra clave de la clase."
)


class GeminiResponseError(Exception):
    """Gemini respondió sin el texto JSON esperado."""


class JsonPost(Protocol):
    """Envía un JSON por HTTP y devuelve la respuesta JSON. Se inyecta para poder probarlo sin red."""

    def __call__(self, url: str, headers: Mapping[str, str], body: Mapping[str, Any]) -> Mapping[str, Any]: ...


def post_json(url: str, headers: Mapping[str, str], body: Mapping[str, Any]) -> Mapping[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={**headers, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
        reply: Mapping[str, Any] = json.loads(response.read())
    return reply


class GeminiLLMClient(LLMClient):
    def __init__(self, *, api_key: str, model: str, recommendations: LLMClient, post: JsonPost = post_json) -> None:
        self._api_key = api_key
        self._url = GEMINI_URL.format(model=model)
        self._post = post
        # De momento las recomendaciones no las genera Gemini: se delegan en otro cliente
        self._recommendations = recommendations

    def generate_material(self, request: Mapping[str, Any]) -> object:
        data = json.dumps(_sin_ruta_del_pdf(request), ensure_ascii=False)
        prompt = f"{GENERATE_MATERIAL_INSTRUCTIONS}\n\nDatos de la clase:\n{data}"
        reply = self._post(
            self._url,
            {API_KEY_HEADER: self._api_key},
            {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            },
        )
        return _json_text(reply)

    def generate_recommendations(self, request: Mapping[str, Any]) -> object:
        return self._recommendations.generate_recommendations(request)


def _sin_ruta_del_pdf(request: Mapping[str, Any]) -> dict[str, Any]:
    """Quita el PDF de la petición: su ruta es un dato interno del servidor y no sale hacia el proveedor."""
    lesson = {campo: valor for campo, valor in request["lesson"].items() if campo != "pdf"}
    return {**request, "lesson": lesson}


def _json_text(reply: Mapping[str, Any]) -> object:
    # Los modelos de pensamiento envían partes con `thought: true` antes del texto: se descartan
    try:
        parts = reply["candidates"][0]["content"]["parts"]
        text = "".join(part["text"] for part in parts if not part.get("thought") and "text" in part)
        result: object = json.loads(text)
    except (KeyError, IndexError, TypeError, ValueError, AttributeError) as error:
        raise GeminiResponseError("respuesta de Gemini sin JSON válido") from error
    return result
