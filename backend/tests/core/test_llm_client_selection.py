from typing import Any

import pytest

from app import composition
from app.composition import build_llm_client
from app.domain.ports import LLMClient
from app.llm.gemini import GeminiLLMClient
from app.llm.simulated import SimulatedLLMClient
from tests.core.settings_factory import make_settings


def test_sin_clave_de_gemini_usa_el_llm_simulado() -> None:
    assert isinstance(build_llm_client(make_settings(gemini_api_key=None)), SimulatedLLMClient)


def test_con_clave_de_gemini_usa_gemini() -> None:
    assert isinstance(build_llm_client(make_settings(gemini_api_key="clave-de-prueba")), GeminiLLMClient)


def test_con_clave_pasa_al_cliente_de_gemini_la_clave_el_modelo_y_el_simulado_para_recomendaciones(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recorded: dict[str, Any] = {}

    def fake_gemini_client(**kwargs: Any) -> LLMClient:
        recorded.update(kwargs)
        return SimulatedLLMClient()

    monkeypatch.setattr(composition, "GeminiLLMClient", fake_gemini_client)

    build_llm_client(
        make_settings(
            gemini_api_key="clave-de-prueba", gemini_model="modelo-de-prueba", gemini_fallback_model="respaldo-de-prueba"
        )
    )

    assert recorded["api_key"] == "clave-de-prueba"
    assert recorded["model"] == "modelo-de-prueba"
    assert recorded["fallback_model"] == "respaldo-de-prueba"
    assert isinstance(recorded["recommendations"], SimulatedLLMClient)
