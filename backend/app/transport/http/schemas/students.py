from pydantic import BaseModel, ConfigDict, Field

from app.domain.entities import Level, StudentDetail


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str
    native_language: str = Field(pattern=r"^[a-z]{2}$", description="Código ISO 639-1")
    level: Level


class StudentDetailOut(StudentOut):
    lessons_count: int = Field(ge=0, description="Clases ya realizadas")

    @classmethod
    def from_entity(cls, detail: StudentDetail) -> "StudentDetailOut":
        return cls.model_validate(
            StudentOut.model_validate(detail.student).model_dump() | {"lessons_count": detail.lessons_count}
        )
