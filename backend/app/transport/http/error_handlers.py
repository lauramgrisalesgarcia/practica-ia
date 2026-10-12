"""Traduce los errores del dominio a respuestas HTTP en un único lugar."""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.domain.errors import (
    AccessDeniedError,
    DomainError,
    InvalidCredentialsError,
    LessonNotFoundError,
    StudentNotFoundError,
)

_RESPONSES: dict[type[DomainError], tuple[int, str]] = {
    InvalidCredentialsError: (status.HTTP_401_UNAUTHORIZED, "Credenciales incorrectas"),
    AccessDeniedError: (status.HTTP_403_FORBIDDEN, "No tienes permiso para acceder a este recurso"),
    StudentNotFoundError: (status.HTTP_404_NOT_FOUND, "Estudiante no encontrado"),
    LessonNotFoundError: (status.HTTP_404_NOT_FOUND, "Clase no encontrada"),
}


def register_error_handlers(app: FastAPI) -> None:
    for error_type, (status_code, detail) in _RESPONSES.items():

        def handler(_: Request, __: Exception, status_code: int = status_code, detail: str = detail) -> JSONResponse:
            return JSONResponse(status_code=status_code, content={"detail": detail})

        app.add_exception_handler(error_type, handler)
