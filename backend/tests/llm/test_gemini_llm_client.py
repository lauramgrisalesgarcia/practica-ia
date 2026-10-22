import json
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from email.message import Message
from typing import Any
from urllib.request import Request

import pytest

from app.domain.material_validation import MAX_OPTIONS, MIN_OPTIONS
from app.domain.ports import LLMClient
from app.llm.gemini import (
    GEMINI_URL,
    RETRY_DELAY_SECONDS,
    GeminiLLMClient,
    GeminiResponseError,
    JsonPost,
    post_json,
)

TOPIC = "Pedir en un restaurante"
PDF_PATH = "lessons/10/restaurante-a2.pdf"

PAYLOAD: dict[str, Any] = {
    "task": "generate_reinforcement_material",
    "activity_type": "complete_sentence",
    "exercise_count": 1,
    "student": {"level": "A2", "native_language": "de"},
    "lesson": {
        "topic": TOPIC,
        "context": "Pedir comida y bebida en un restaurante",
        "keywords": ["la carta", "quisiera"],
        "notes": None,
        "pdf": {"filename": "restaurante-a2.pdf", "path": PDF_PATH},
    },
    "output_language": "es",
}

MATERIAL: dict[str, Any] = {
    "activity_type": "complete_sentence",
    "title": "Refuerzo: Pedir en un restaurante",
    "instructions": "Completa cada frase con la palabra o expresión correcta.",
    "exercises": [
        {
            "id": 1,
            "sentence": "Para pedir, digo: «___», por favor.",
            "options": ["quisiera", "la carta", "gracias"],
            "correct_option": "quisiera",
        }
    ],
}

RECOMMENDATIONS: dict[str, Any] = {"feedback": "¡Buen trabajo!", "recommendations": ["Repasa «la carta»."]}


class FakeJsonPost:
    """Sustituye la llamada HTTP: registra la petición y devuelve una respuesta preparada."""

    def __init__(self, reply: Mapping[str, Any]) -> None:
        self.reply = reply
        self.calls: list[tuple[str, Mapping[str, str], Mapping[str, Any]]] = []

    def __call__(self, url: str, headers: Mapping[str, str], body: Mapping[str, Any]) -> Mapping[str, Any]:
        self.calls.append((url, headers, body))
        return self.reply


class FakeRecommendations(LLMClient):
    """Cliente de recomendaciones inyectado: el material no debe pedírsele nunca."""

    def generate_material(self, request: Mapping[str, Any]) -> object:
        raise AssertionError("el material no debe pedirse a este cliente")

    def generate_recommendations(self, request: Mapping[str, Any]) -> object:
        return RECOMMENDATIONS


class FakeHttpResponse:
    def __init__(self, body: bytes) -> None:
        self._body = body

    def __enter__(self) -> "FakeHttpResponse":
        return self

    def __exit__(self, *_: object) -> None:
        return None

    def read(self) -> bytes:
        return self._body


def gemini_reply(text: str) -> dict[str, Any]:
    """Forma de respuesta de `generateContent` de la API de Gemini."""
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


def no_sleep(_: float) -> None:
    return None


def make_client(
    post: JsonPost, recommendations: LLMClient = FakeRecommendations(), sleep: Callable[[float], None] = no_sleep
) -> GeminiLLMClient:
    return GeminiLLMClient(
        api_key="clave-de-prueba", model="modelo-de-prueba", post=post, recommendations=recommendations, sleep=sleep
    )


def sent_prompt(payload: Mapping[str, Any]) -> str:
    post = FakeJsonPost(gemini_reply(json.dumps(MATERIAL)))
    make_client(post).generate_material(payload)
    _, _, body = post.calls[0]
    return str(body["contents"][0]["parts"][0]["text"])


def with_lesson(exercise_count: int, keywords: list[str]) -> dict[str, Any]:
    return {**PAYLOAD, "exercise_count": exercise_count, "lesson": {**PAYLOAD["lesson"], "keywords": keywords}}


def http_error(status: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError(GEMINI_URL, status, "error de prueba", Message(), None)


class FlakyJsonPost:
    """Falla con los códigos indicados, en orden, y después responde."""

    def __init__(self, failures: list[int], reply: Mapping[str, Any]) -> None:
        self.failures = failures
        self.reply = reply
        self.calls = 0

    def __call__(self, url: str, headers: Mapping[str, str], body: Mapping[str, Any]) -> Mapping[str, Any]:
        self.calls += 1
        if self.failures:
            raise http_error(self.failures.pop(0))
        return self.reply


def test_devuelve_el_material_que_responde_el_modelo() -> None:
    client = make_client(FakeJsonPost(gemini_reply(json.dumps(MATERIAL))))

    assert client.generate_material(PAYLOAD) == MATERIAL


def test_envia_la_clase_en_el_prompt_con_la_clave_en_la_cabecera() -> None:
    post = FakeJsonPost(gemini_reply(json.dumps(MATERIAL)))

    make_client(post).generate_material(PAYLOAD)

    url, headers, body = post.calls[0]
    prompt = body["contents"][0]["parts"][0]["text"]
    assert "modelo-de-prueba" in url
    assert headers["x-goog-api-key"] == "clave-de-prueba"
    assert TOPIC in prompt
    assert body["generationConfig"]["responseMimeType"] == "application/json"


def test_no_envia_la_ruta_del_pdf_al_proveedor() -> None:
    post = FakeJsonPost(gemini_reply(json.dumps(MATERIAL)))

    make_client(post).generate_material(PAYLOAD)

    _, _, body = post.calls[0]
    assert PDF_PATH not in json.dumps(body, ensure_ascii=False)


def test_lee_el_json_aunque_el_modelo_envie_partes_de_pensamiento() -> None:
    reply = {
        "candidates": [
            {"content": {"parts": [{"thought": True, "text": "Pienso en la clase..."}, {"text": json.dumps(MATERIAL)}]}}
        ]
    }

    assert make_client(FakeJsonPost(reply)).generate_material(PAYLOAD) == MATERIAL


def test_si_el_modelo_no_responde_json_falla() -> None:
    client = make_client(FakeJsonPost(gemini_reply("no es json")))

    with pytest.raises(GeminiResponseError):
        client.generate_material(PAYLOAD)


def test_si_la_respuesta_no_trae_texto_falla() -> None:
    client = make_client(FakeJsonPost({"candidates": []}))

    with pytest.raises(GeminiResponseError):
        client.generate_material(PAYLOAD)


def test_las_recomendaciones_se_piden_al_cliente_inyectado_y_no_a_gemini() -> None:
    post = FakeJsonPost(gemini_reply("no debe usarse"))

    response = make_client(post).generate_recommendations({})

    assert response == RECOMMENDATIONS
    assert post.calls == []


def test_post_json_envia_un_post_con_la_clave_y_el_cuerpo_en_json(monkeypatch: pytest.MonkeyPatch) -> None:
    sent: list[Request] = []

    def fake_urlopen(request: Request, timeout: float) -> FakeHttpResponse:
        sent.append(request)
        return FakeHttpResponse(json.dumps(gemini_reply("{}")).encode("utf-8"))

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)

    reply = post_json(
        GEMINI_URL.format(model="modelo-de-prueba"),
        {"x-goog-api-key": "clave-de-prueba"},
        {"contents": [{"parts": [{"text": TOPIC}]}]},
    )

    request = sent[0]
    assert request.get_method() == "POST"
    assert request.full_url == GEMINI_URL.format(model="modelo-de-prueba")
    assert request.get_header("X-goog-api-key") == "clave-de-prueba"
    assert request.get_header("Content-type") == "application/json"
    assert isinstance(request.data, bytes)
    assert json.loads(request.data) == {"contents": [{"parts": [{"text": TOPIC}]}]}
    assert reply == gemini_reply("{}")


def test_el_prompt_pide_la_cantidad_exacta_el_tipo_de_actividad_y_los_ids() -> None:
    prompt = sent_prompt(with_lesson(4, ["la carta", "quisiera"]))

    assert "exactamente 4 ejercicios" in prompt
    assert "ids enteros del 1 al 4" in prompt
    assert 'activity_type debe ser exactamente "complete_sentence"' in prompt


def test_con_al_menos_tantos_ejercicios_como_palabras_clave_pide_usarlas_todas() -> None:
    prompt = sent_prompt(with_lesson(2, ["la carta", "quisiera"]))

    assert "usa todas las palabras clave" in prompt
    assert "no repitas ninguna palabra clave" not in prompt


def test_con_menos_ejercicios_que_palabras_clave_pide_no_repetirlas() -> None:
    prompt = sent_prompt(with_lesson(1, ["la carta", "quisiera"]))

    assert "no repitas ninguna palabra clave" in prompt
    assert "usa todas las palabras clave" not in prompt


def test_reintenta_una_vez_si_gemini_esta_saturado() -> None:
    post = FlakyJsonPost([503], gemini_reply(json.dumps(MATERIAL)))
    sleeps: list[float] = []

    response = make_client(post, sleep=sleeps.append).generate_material(PAYLOAD)

    assert response == MATERIAL
    assert post.calls == 2
    assert sleeps == [RETRY_DELAY_SECONDS]


def test_si_sigue_saturado_tras_el_reintento_falla() -> None:
    post = FlakyJsonPost([503, 503], gemini_reply(json.dumps(MATERIAL)))

    with pytest.raises(urllib.error.HTTPError):
        make_client(post).generate_material(PAYLOAD)
    assert post.calls == 2


# 429 es cuota agotada (por minuto o por día): reintentar a los pocos segundos solo gasta otra petición
@pytest.mark.parametrize("status", [400, 429])
def test_no_reintenta_los_errores_que_no_son_de_saturacion(status: int) -> None:
    post = FlakyJsonPost([status], gemini_reply(json.dumps(MATERIAL)))

    with pytest.raises(urllib.error.HTTPError):
        make_client(post).generate_material(PAYLOAD)
    assert post.calls == 1


def test_el_prompt_pide_las_opciones_dentro_de_los_limites_del_dominio() -> None:
    prompt = sent_prompt(PAYLOAD)

    assert f"entre {MIN_OPTIONS} y {MAX_OPTIONS} opciones distintas" in prompt


def test_el_prompt_exige_que_solo_una_opcion_encaje_en_la_frase() -> None:
    prompt = sent_prompt(PAYLOAD)

    assert "exactamente una opción correcta" in prompt
    assert "sujeto explícito" in prompt
    assert "si más de una opción encaja, reescribe la frase" in prompt


def with_level(level: str) -> dict[str, Any]:
    return {**PAYLOAD, "student": {**PAYLOAD["student"], "level": level}}


def test_en_a1_el_prompt_solo_permite_los_tiempos_verbales_del_nivel() -> None:
    prompt = sent_prompt(with_level("A1"))

    assert "usa solo estos tiempos verbales, propios del nivel A1: presente de indicativo" in prompt
    assert "pretérito indefinido" not in prompt
    assert "subjuntivo" not in prompt


def test_en_b2_el_prompt_suma_los_tiempos_de_los_niveles_anteriores() -> None:
    prompt = sent_prompt(with_level("B2"))

    assert "presente de indicativo" in prompt
    assert "pretérito indefinido" in prompt
    assert "presente de subjuntivo" in prompt
    assert "pretérito imperfecto de subjuntivo" in prompt
    assert "pluscuamperfecto de subjuntivo" not in prompt


def test_el_prompt_pide_vocabulario_propio_del_nivel_del_estudiante() -> None:
    assert "vocabulario y expresiones propios del nivel A2" in sent_prompt(with_level("A2"))


def test_el_prompt_pide_variar_los_sujetos_sin_romper_la_concordancia() -> None:
    prompt = sent_prompt(PAYLOAD)

    assert "varía los sujetos" in prompt
    assert "la abuela" in prompt
    assert "concuerde con la respuesta correcta" in prompt
