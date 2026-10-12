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
