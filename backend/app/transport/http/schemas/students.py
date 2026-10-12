from pydantic import BaseModel, ConfigDict, Field

from app.domain.entities import Level


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str
    native_language: str = Field(pattern=r"^[a-z]{2}$", description="Código ISO 639-1")
    level: Level
