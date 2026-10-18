"""Validación de la respuesta del LLM contra el esquema del material de refuerzo.

Reglas (docs/001-backend-requirements.md):
- `activity_type` igual al pedido; `title` e `instructions` no vacíos.
- Exactamente `exercise_count` ejercicios.
- Cada ejercicio: `id` entero único; `sentence` con exactamente un hueco `___`;
  2–4 `options` distintas y no vacías; `correct_option` es una de las `options`.
- Coherencia con las palabras clave pedidas (sin distinguir mayúsculas ni espacios sobrantes):
  la `correct_option` de cada ejercicio es una palabra clave, y se usan todas al menos una vez;
  si hay más palabras clave que ejercicios, cada ejercicio usa una distinta.
"""

from collections.abc import Mapping
from datetime import datetime

from app.domain.entities import ActivityType, Exercise, Material, MaterialGenerationRequest
from app.domain.errors import InvalidLLMResponseError

BLANK = "___"
MIN_OPTIONS = 2
MAX_OPTIONS = 4


def parse_generated_material(
    response: object, request: MaterialGenerationRequest, *, generated_at: datetime
) -> Material:
    """Convierte la respuesta del LLM en un `Material` válido o lanza `InvalidLLMResponseError`."""
    data = _mapping(response, "la respuesta")
    if data.get("activity_type") != request.activity_type.value:
        raise InvalidLLMResponseError("tipo de actividad distinto al pedido")

    raw_exercises = data.get("exercises")
    if not isinstance(raw_exercises, list) or len(raw_exercises) != request.exercise_count:
        raise InvalidLLMResponseError("cantidad de ejercicios distinta a la pedida")
    exercises = tuple(_exercise(raw) for raw in raw_exercises)
    if len({exercise.id for exercise in exercises}) != len(exercises):
        raise InvalidLLMResponseError("ids de ejercicio repetidos")
    _check_keywords(exercises, request.keywords)

    return Material(
        generated_at=generated_at,
        activity_type=ActivityType(request.activity_type),
        exercise_count=request.exercise_count,
        title=_text(data.get("title"), "title"),
        instructions=_text(data.get("instructions"), "instructions"),
        exercises=exercises,
    )


def _exercise(raw: object) -> Exercise:
    data = _mapping(raw, "un ejercicio")
    exercise_id = data.get("id")
    if not isinstance(exercise_id, int) or isinstance(exercise_id, bool):
        raise InvalidLLMResponseError("id de ejercicio no entero")

    sentence = _text(data.get("sentence"), "sentence")
    if sentence.count(BLANK) != 1:
        raise InvalidLLMResponseError("la frase debe tener exactamente un hueco")

    raw_options = data.get("options")
    if not isinstance(raw_options, list) or not MIN_OPTIONS <= len(raw_options) <= MAX_OPTIONS:
        raise InvalidLLMResponseError("cantidad de opciones no válida")
    options = tuple(_text(option, "options") for option in raw_options)
    if len(set(options)) != len(options):
        raise InvalidLLMResponseError("opciones repetidas")

    correct_option = data.get("correct_option")
    if correct_option not in options:
        raise InvalidLLMResponseError("la respuesta correcta no está entre las opciones")

    return Exercise(id=exercise_id, sentence=sentence, options=options, correct_option=str(correct_option))


def _normalize(text: str) -> str:
    return " ".join(text.split()).casefold()


def _check_keywords(exercises: tuple[Exercise, ...], keywords: tuple[str, ...]) -> None:
    expected = {_normalize(keyword) for keyword in keywords}
    answers = [_normalize(exercise.correct_option) for exercise in exercises]
    if any(answer not in expected for answer in answers):
        raise InvalidLLMResponseError("una respuesta correcta no es una de las palabras clave")
    if len(answers) >= len(expected):
        if set(answers) != expected:
            raise InvalidLLMResponseError("no se usan todas las palabras clave")
    elif len(set(answers)) != len(answers):
        raise InvalidLLMResponseError("palabras clave repetidas con menos ejercicios que palabras clave")


def _mapping(value: object, what: str) -> Mapping[str, object]:
    if not isinstance(value, Mapping):
        raise InvalidLLMResponseError(f"{what} no es un objeto")
    return value


def _text(value: object, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise InvalidLLMResponseError(f"{field} vacío o no es texto")
    return value
