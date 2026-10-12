from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.entities import MaterialStatus


class LessonSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    date: datetime
    duration_minutes: int = Field(ge=1)
    topic: str
    context: str
    material_status: MaterialStatus
