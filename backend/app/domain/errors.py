class DomainError(Exception):
    """Error de negocio. La capa de transporte decide cómo presentarlo."""


class InvalidCredentialsError(DomainError):
    """El correo no existe o la contraseña no es correcta (no se distingue a propósito)."""


class AccessDeniedError(DomainError):
    """El usuario no tiene el rol necesario para esta acción."""


class NotFoundError(DomainError):
    """El recurso no existe o pertenece a otro usuario (no se distingue a propósito)."""


class StudentNotFoundError(NotFoundError):
    pass


class LessonNotFoundError(NotFoundError):
    pass


class LessonPdfNotFoundError(NotFoundError):
    """La clase existe, pero su archivo PDF no está en el almacenamiento."""


class ConflictError(DomainError):
    """La acción no es posible en el estado actual del recurso."""


class LessonNotCompletedError(ConflictError):
    """Solo se puede generar material para clases ya realizadas."""


class MaterialAlreadySubmittedError(ConflictError):
    """El estudiante ya resolvió el material: no se puede regenerar."""


class InvalidLLMResponseError(DomainError):
    """El LLM falló o su respuesta no cumple el esquema del material."""
