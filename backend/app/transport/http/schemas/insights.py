from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.entities import InsightActivityType, TeacherInsights


class WeeklyCountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    week_start: date = Field(description="Lunes de la semana (UTC)")
    count: int = Field(ge=0)


class MaterialStatusCountsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    completed: int = Field(ge=0)
    pending: int = Field(ge=0)
    none: int = Field(ge=0)


class RecentActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    type: InsightActivityType
    date: datetime
    lesson_id: UUID
    student_name: str
    topic: str
    score: float | None = Field(ge=0, le=100, description="Porcentaje de aciertos; solo en las entregas")


class CalendarLessonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lesson_id: UUID
    start: datetime
    student_name: str
    topic: str


class TeacherInsightsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    lessons_this_month: int = Field(ge=0)
    pending_materials: int = Field(ge=0)
    material_status: MaterialStatusCountsOut
    weekly_lessons: list[WeeklyCountOut] = Field(min_length=8, max_length=8)
    recent_activity: list[RecentActivityOut] = Field(max_length=10)
    calendar: list[CalendarLessonOut]

    @classmethod
    def from_entity(cls, insights: TeacherInsights) -> "TeacherInsightsOut":
        return cls.model_validate(insights)
