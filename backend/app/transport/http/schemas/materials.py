from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, Field, StringConstraints
from pydantic.json_schema import SkipJsonSchema

from app.domain.entities import ActivityType, Material
from app.transport.http.schemas.lessons import TeacherMaterialOut

Keyword = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]


class GenerateMaterialIn(BaseModel):
    activity_type: ActivityType
    exercise_count: int = Field(ge=1, le=15)
    keywords: Annotated[list[Keyword], Field(min_length=1, max_length=20)] | SkipJsonSchema[None] = Field(
        default=None,
        description=(
            "Palabras clave revisadas por el docente. Opcional: si se omite se usan las de la clase. "
            "No modifica las palabras clave guardadas en la clase."
        ),
    )


class GeneratedMaterialOut(TeacherMaterialOut):
    lesson_id: UUID

    @classmethod
    def from_material(cls, lesson_id: UUID, material: Material) -> "GeneratedMaterialOut":
        base = TeacherMaterialOut.from_entity(material)
        return cls(lesson_id=lesson_id, **base.model_dump())
