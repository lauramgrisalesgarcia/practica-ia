"""Traduce los errores del dominio a respuestas HTTP en un único lugar."""

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
)

_RESPONSES: dict[type[DomainError], tuple[int, str]] = {
    InvalidCredentialsError: (status.HTTP_401_UNAUTHORIZED, "Credenciales incorrectas"),
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


def register_error_handlers(app: FastAPI) -> None:
    for error_type, (status_code, detail) in _RESPONSES.items():

        def handler(_: Request, __: Exception, status_code: int = status_code, detail: str = detail) -> JSONResponse:
            return JSONResponse(status_code=status_code, content={"detail": detail})

        app.add_exception_handler(error_type, handler)
