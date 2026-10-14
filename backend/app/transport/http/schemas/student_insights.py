from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.entities import InsightActivityType, StudentInsights


class StudentPendingMaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lesson_id: UUID
    topic: str
    date: datetime = Field(description="Fecha de la clase")
    exercise_count: int = Field(ge=1, le=15)


class StudentActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    type: InsightActivityType
    date: datetime
    lesson_id: UUID
    topic: str
    score: float | None = Field(ge=0, le=100, description="Porcentaje de aciertos; solo en las entregas")


class StudentCalendarLessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lesson_id: UUID
    start: datetime
    topic: str


class ScorePointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lesson_id: UUID
    topic: str
    submitted_at: datetime
    score: float = Field(ge=0, le=100)


class StudentInsightsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lessons_count: int = Field(ge=0)
    completed_materials: int = Field(ge=0)
    average_score: float | None = Field(ge=0, le=100)
    pending_materials: list[StudentPendingMaterialOut]
    recent_activity: list[StudentActivityOut] = Field(max_length=10)
    calendar: list[StudentCalendarLessonOut]
    score_history: list[ScorePointOut] = Field(max_length=10)

    @classmethod
    def from_entity(cls, insights: StudentInsights) -> "StudentInsightsOut":
        return cls.model_validate(insights)
