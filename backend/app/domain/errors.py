class DomainError(Exception):
    """Error de negocio. La capa de transporte decide cómo presentarlo."""


class InvalidCredentialsError(DomainError):
    """El correo no existe o la contraseña no es correcta (no se distingue a propósito)."""
