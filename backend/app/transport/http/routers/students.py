from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from app.composition import get_get_my_lesson_pdf, get_get_my_material, get_list_my_lessons
from app.domain.use_cases.get_my_lesson_pdf import GetMyLessonPdf
from app.domain.use_cases.get_my_material import GetMyMaterial
from app.domain.use_cases.list_my_lessons import ListMyLessons
from app.transport.http.dependencies import CurrentUser
from app.transport.http.files import PDF_RESPONSES, pdf_response
from app.transport.http.schemas.lessons import StudentLessonSummaryOut
from app.transport.http.schemas.materials import StudentMaterialOut

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


@router.get("/lessons/{lesson_id}/pdf", response_class=Response, responses=PDF_RESPONSES)
def get_my_lesson_pdf(
    user: CurrentUser,
    get_pdf: Annotated[GetMyLessonPdf, Depends(get_get_my_lesson_pdf)],
    lesson_id: UUID,
) -> Response:
    return pdf_response(get_pdf.execute(user, lesson_id))


@router.get("/lessons/{lesson_id}/material", response_model=StudentMaterialOut)
def get_my_material(
    user: CurrentUser,
    get_material: Annotated[GetMyMaterial, Depends(get_get_my_material)],
    lesson_id: UUID,
) -> StudentMaterialOut:
    return StudentMaterialOut.from_entity(get_material.execute(user, lesson_id))
