"""Interfaces que el dominio necesita y que implementan otras capas (inversión de dependencias)."""

from typing import Protocol

from app.domain.entities import User


class UserRepository(Protocol):
    def get_by_id(self, user_id: int) -> User | None: ...

    def get_by_email(self, email: str) -> User | None:
        """Busca por correo exacto; quien llama lo normaliza a minúsculas."""
        ...


class PasswordHasher(Protocol):
    @property
    def dummy_hash(self) -> str:
        """Hash válido de una contraseña de relleno, para igualar tiempos de respuesta."""
        ...

    def verify(self, password: str, password_hash: str) -> bool: ...
