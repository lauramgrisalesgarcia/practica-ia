import json
import urllib.request
from collections.abc import Mapping
from typing import Any
from urllib.request import Request

import pytest

from app.domain.ports import LLMClient
from app.llm.gemini import GEMINI_URL, GeminiLLMClient, GeminiResponseError, JsonPost, post_json

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


def make_client(post: JsonPost, recommendations: LLMClient = FakeRecommendations()) -> GeminiLLMClient:
    return GeminiLLMClient(
        api_key="clave-de-prueba", model="modelo-de-prueba", post=post, recommendations=recommendations
    )


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
