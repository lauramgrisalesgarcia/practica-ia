"""Cliente real del LLM: Gemini (API de Google AI Studio). Implementa el puerto `LLMClient`.

El dominio construye la petición (`MaterialGenerationRequest.to_llm_payload()`); este adaptador la
envía como prompt y devuelve el JSON que responde el modelo, sin validarlo: la validación la hace el dominio.
"""

import json
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from http import HTTPStatus
from typing import Any, Protocol

from app.domain.entities import Level
from app.domain.material_validation import MAX_OPTIONS, MIN_OPTIONS
from app.domain.ports import LLMClient

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
API_KEY_HEADER = "x-goog-api-key"
TIMEOUT_SECONDS = 60
# Gemini responde 503 cuando el modelo está saturado (suele ser momentáneo): se reintenta una vez.
# 429 es cuota agotada y no se reintenta: a los pocos segundos volvería a fallar.
RETRYABLE_STATUSES = frozenset({HTTPStatus.SERVICE_UNAVAILABLE})
RETRY_DELAY_SECONDS = 2.0

# Tiempos verbales que se introducen en cada nivel del MCER (orientativo, según el Plan Curricular del
# Instituto Cervantes). Cada nivel usa también los de los niveles anteriores.
NEW_TENSES_BY_LEVEL: Mapping[Level, tuple[str, ...]] = {
    Level.A1: ("presente de indicativo", "ir a + infinitivo"),
    Level.A2: (
        "pretérito perfecto",
        "pretérito indefinido",
        "pretérito imperfecto",
        "estar + gerundio",
        "imperativo afirmativo",
    ),
    Level.B1: (
        "futuro simple",
        "condicional simple",
        "pretérito pluscuamperfecto",
        "presente de subjuntivo",
        "imperativo negativo",
    ),
    Level.B2: (
        "pretérito perfecto de subjuntivo",
        "pretérito imperfecto de subjuntivo",
        "futuro compuesto",
        "condicional compuesto",
    ),
    Level.C1: ("pretérito pluscuamperfecto de subjuntivo",),
    Level.C2: (),
}

GENERATE_MATERIAL_INSTRUCTIONS = (
    "Eres un profesor de español para extranjeros. Crea material de refuerzo a partir de los datos de la clase. "
    "Responde solo con JSON, en español, con la forma: "
    '{"activity_type", "title", "instructions", "exercises": [{"id", "sentence", "options", "correct_option"}]}. '
    "Cada frase lleva exactamente un hueco «___». "
    # Sin sujeto, «Siempre ___ zapatos cómodos» admite llevo, llevas y lleva: el contexto debe descartar las demás
    "Cada ejercicio tiene exactamente una opción correcta: el contexto de la frase (sujeto explícito, "
    "concordancia de género y número, tiempo verbal) debe hacer incorrectas las demás. Si las opciones son "
    "formas de la misma palabra o del mismo verbo, incluye el sujeto o una pista que deje una sola válida "
    "(por ejemplo, «Mi abuela siempre ___ zapatos cómodos»). Antes de responder, revisa cada ejercicio: "
    "si más de una opción encaja, reescribe la frase."
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
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        recommendations: LLMClient,
        post: JsonPost = post_json,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self._api_key = api_key
        self._url = GEMINI_URL.format(model=model)
        self._post = post
        self._sleep = sleep
        # De momento las recomendaciones no las genera Gemini: se delegan en otro cliente
        self._recommendations = recommendations

    def generate_material(self, request: Mapping[str, Any]) -> object:
        reply = self._send(
            {
                "contents": [{"parts": [{"text": _material_prompt(request)}]}],
                "generationConfig": {"responseMimeType": "application/json"},
            }
        )
        return _json_text(reply)

    def generate_recommendations(self, request: Mapping[str, Any]) -> object:
        return self._recommendations.generate_recommendations(request)

    def _send(self, body: Mapping[str, Any]) -> Mapping[str, Any]:
        headers = {API_KEY_HEADER: self._api_key}
        try:
            return self._post(self._url, headers, body)
        except urllib.error.HTTPError as error:
            if error.code not in RETRYABLE_STATUSES:
                raise
        self._sleep(RETRY_DELAY_SECONDS)
        return self._post(self._url, headers, body)


def _material_prompt(request: Mapping[str, Any]) -> str:
    """Instrucciones con las reglas que comprueba `material_validation`, seguidas de los datos de la clase."""
    count = int(request["exercise_count"])
    keyword_count = len(request["lesson"]["keywords"])
    keyword_rule = (
        "usa todas las palabras clave como respuesta correcta al menos una vez"
        if count >= keyword_count
        else "no repitas ninguna palabra clave como respuesta correcta"
    )
    rules = (
        f"Genera exactamente {count} ejercicios, con ids enteros del 1 al {count}. "
        f'El campo activity_type debe ser exactamente "{request["activity_type"]}". '
        f"Cada ejercicio tiene entre {MIN_OPTIONS} y {MAX_OPTIONS} opciones distintas (mejor tres); "
        "la correcta está entre ellas y es una palabra clave de la clase. "
        f"Entre todos los ejercicios, {keyword_rule}."
    )
    level_rules = _level_rules(Level(request["student"]["level"]))
    data = json.dumps(_sin_ruta_del_pdf(request), ensure_ascii=False)
    return f"{GENERATE_MATERIAL_INSTRUCTIONS} {rules} {level_rules}\n\nDatos de la clase:\n{data}"


def _level_rules(level: Level) -> str:
    """Tiempos verbales, vocabulario y variedad de sujetos adecuados al nivel MCER del estudiante."""
    return (
        f"El estudiante tiene nivel {level}: usa vocabulario y expresiones propios del nivel {level} "
        f"y usa solo estos tiempos verbales, propios del nivel {level}: {', '.join(_tenses_up_to(level))}. "
        "Las opciones incorrectas también deben ser palabras de ese nivel. "
        "Entre los ejercicios, varía los sujetos: pronombres (yo, tú, él, ella, nosotros, ustedes) y personas "
        "nombradas (la abuela, el señor García, mis amigos), siempre que el sujeto concuerde con la respuesta "
        "correcta, que tiene que ser exactamente una palabra clave: si la palabra clave es una forma conjugada "
        "(por ejemplo, «llevo»), usa el sujeto que le corresponde. "
        # El docente puede elegir a propósito una palabra clave de otro nivel (p. ej. «quisiera» como fórmula de cortesía)
        "Ten en cuenta que las palabras clave las elige el docente: úsalas tal cual como respuesta correcta aunque "
        "sean de otro nivel, y la regla de tiempos verbales se aplica al resto de la frase y a las opciones "
        "incorrectas. Antes de responder, comprueba también que, salvo las palabras clave, cada frase y cada "
        "opción usan palabras y tiempos verbales de ese nivel."
    )


def _tenses_up_to(level: Level) -> tuple[str, ...]:
    """Tiempos del nivel y de todos los anteriores, en orden de aparición."""
    levels = list(Level)
    return tuple(tense for previous in levels[: levels.index(level) + 1] for tense in NEW_TENSES_BY_LEVEL[previous])


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
