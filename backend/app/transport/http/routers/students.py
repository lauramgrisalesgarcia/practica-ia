from typing import Annotated

from fastapi import APIRouter, Depends

from app.composition import get_list_my_lessons
from app.domain.use_cases.list_my_lessons import ListMyLessons
from app.transport.http.dependencies import CurrentUser
from app.transport.http.schemas.lessons import StudentLessonSummaryOut

router = APIRouter(prefix="/students/me", tags=["Estudiante"])


@router.get("/lessons", response_model=list[StudentLessonSummaryOut])
def list_my_lessons(
    user: CurrentUser,
    list_lessons: Annotated[ListMyLessons, Depends(get_list_my_lessons)],
) -> list[StudentLessonSummaryOut]:
    return [
        StudentLessonSummaryOut.from_entity(lesson, pdf_url=f"{router.prefix}/lessons/{lesson.id}/pdf")
        for lesson in list_lessons.execute(user)
    ]
