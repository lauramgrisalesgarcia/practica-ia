import enum
from dataclasses import dataclass


class Role(enum.StrEnum):
    DOCENTE = "docente"
    ESTUDIANTE = "estudiante"


@dataclass(frozen=True, slots=True)
class User:
    id: int
    first_name: str
    last_name: str
    email: str
    password_hash: str
    role: Role
