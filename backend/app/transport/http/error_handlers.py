"""Traduce los errores del dominio a respuestas HTTP en un único lugar, y registra los relevantes."""

import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.domain.errors import (
    AccessDeniedError,
    DomainError,
    InvalidAnswersError,
    InvalidCredentialsError,
    InvalidLLMResponseError,
    InvalidRecommendationsError,
    LessonNotCompletedError,
    LessonNotFoundError,
    LessonPdfNotFoundError,
    MaterialAlreadyGeneratedError,
    MaterialNotFoundError,
    StudentNotFoundError,
    SubmissionAlreadyExistsError,
    SubmissionNotFoundError,
    TooManyLoginAttemptsError,
)

logger = logging.getLogger(__name__)

_RESPONSES: dict[type[DomainError], tuple[int, str]] = {
    InvalidCredentialsError: (status.HTTP_401_UNAUTHORIZED, "Credenciales incorrectas"),
    TooManyLoginAttemptsError: (
        status.HTTP_429_TOO_MANY_REQUESTS,
        "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.",
    ),
    AccessDeniedError: (status.HTTP_403_FORBIDDEN, "No tienes permiso para acceder a este recurso"),
    StudentNotFoundError: (status.HTTP_404_NOT_FOUND, "Estudiante no encontrado"),
    LessonNotFoundError: (status.HTTP_404_NOT_FOUND, "Clase no encontrada"),
    LessonPdfNotFoundError: (status.HTTP_404_NOT_FOUND, "El PDF de la clase no está disponible"),
    MaterialNotFoundError: (status.HTTP_404_NOT_FOUND, "La clase no tiene material de refuerzo"),
    SubmissionNotFoundError: (status.HTTP_404_NOT_FOUND, "Aún no has resuelto este material"),
    LessonNotCompletedError: (status.HTTP_409_CONFLICT, "Solo se puede generar material para clases ya realizadas"),
    MaterialAlreadyGeneratedError: (
        status.HTTP_409_CONFLICT,
        "El material de refuerzo de esta clase ya se generó y no se puede volver a generar",
    ),
    InvalidLLMResponseError: (status.HTTP_502_BAD_GATEWAY, "No se pudo generar el material de refuerzo"),
    SubmissionAlreadyExistsError: (status.HTTP_409_CONFLICT, "El material ya fue resuelto"),
    InvalidAnswersError: (
        status.HTTP_422_UNPROCESSABLE_CONTENT,
        "Debes responder todos los ejercicios con una opción válida",
    ),
    InvalidRecommendationsError: (status.HTTP_502_BAD_GATEWAY, "No se pudieron generar las recomendaciones"),
}


# Eventos de seguridad que se registran con el origen de la petición (sin datos de la petición)
_SECURITY_EVENTS: dict[type[Exception], str] = {
    InvalidCredentialsError: "Inicio de sesión fallido",
    TooManyLoginAttemptsError: "Inicio de sesión bloqueado por demasiados intentos",
}


def _log(request: Request, error: Exception, status_code: int, detail: str) -> None:
    if status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
        # La causa (p. ej. el 503 de Gemini) explica el fallo; nunca incluye la clave del proveedor
        logger.error("%s: %s (causa: %r)", detail, error, error.__cause__)
    elif (event := _SECURITY_EVENTS.get(type(error))) is not None:
        origin = request.client.host if request.client else "desconocido"
        logger.warning("%s desde %s", event, origin)


def register_error_handlers(app: FastAPI) -> None:
    for error_type, (status_code, detail) in _RESPONSES.items():

        def handler(request: Request, error: Exception, status_code: int = status_code, detail: str = detail) -> JSONResponse:
            _log(request, error, status_code, detail)
            return JSONResponse(status_code=status_code, content={"detail": detail})

        app.add_exception_handler(error_type, handler)
