"""Validación de la respuesta de recomendaciones del LLM.

Reglas (docs/001-backend-requirements.md): "feedback" es un texto no vacío y
"recommendations" es una lista de 1 a 5 textos no vacíos.
"""

from collections.abc import Mapping

from app.domain.errors import InvalidRecommendationsError

MAX_RECOMMENDATIONS = 5


def parse_recommendations(response: object) -> tuple[str, tuple[str, ...]]:
    """Devuelve (feedback, recomendaciones) o lanza InvalidRecommendationsError."""
    if not isinstance(response, Mapping):
        raise InvalidRecommendationsError("la respuesta no es un objeto")
    feedback = response.get("feedback")
    if not isinstance(feedback, str) or not feedback.strip():
        raise InvalidRecommendationsError("feedback vacío")
    recommendations = response.get("recommendations")
    if not isinstance(recommendations, list) or not 1 <= len(recommendations) <= MAX_RECOMMENDATIONS:
        raise InvalidRecommendationsError("cantidad de recomendaciones no válida")
    if not all(isinstance(item, str) and item.strip() for item in recommendations):
        raise InvalidRecommendationsError("recomendación vacía")
    return feedback, tuple(recommendations)
