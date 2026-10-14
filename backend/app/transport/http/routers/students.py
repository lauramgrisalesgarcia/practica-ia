from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.composition import (
    get_get_my_lesson_pdf,
    get_get_student_insights,
    get_get_my_material,
    get_get_my_submission,
    get_list_my_lessons,
    get_submit_material,
)
from app.domain.entities import Answer
from app.domain.use_cases.get_my_lesson_pdf import GetMyLessonPdf
from app.domain.use_cases.get_my_material import GetMyMaterial
from app.domain.use_cases.get_my_submission import GetMySubmission
from app.domain.use_cases.get_student_insights import GetStudentInsights
from app.domain.use_cases.list_my_lessons import ListMyLessons
from app.domain.use_cases.submit_material import SubmitMaterial
from app.transport.http.dependencies import CurrentUser
from app.transport.http.files import PDF_RESPONSES, pdf_response
from app.transport.http.schemas.lessons import StudentLessonSummaryOut
from app.transport.http.schemas.student_insights import StudentInsightsOut
from app.transport.http.schemas.materials import StudentMaterialOut, SubmissionOut, SubmitMaterialIn

router = APIRouter(prefix="/students/me", tags=["Estudiante"])


@router.get("/insights", response_model=StudentInsightsOut)
def get_my_insights(
    user: CurrentUser,
    get_insights: Annotated[GetStudentInsights, Depends(get_get_student_insights)],
) -> StudentInsightsOut:
    return StudentInsightsOut.from_entity(get_insights.execute(user))


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


@router.post(
    "/lessons/{lesson_id}/material/submission",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
def submit_material(
    user: CurrentUser,
    submit: Annotated[SubmitMaterial, Depends(get_submit_material)],
    lesson_id: UUID,
    body: SubmitMaterialIn,
) -> SubmissionOut:
    answers = [Answer(answer.exercise_id, answer.selected_option) for answer in body.answers]
    result = submit.execute(user, lesson_id, answers)
    return SubmissionOut.from_entity(result.lesson_id, result.submission, result.grade)


@router.get("/lessons/{lesson_id}/material/submission", response_model=SubmissionOut)
def get_my_submission(
    user: CurrentUser,
    get_submission: Annotated[GetMySubmission, Depends(get_get_my_submission)],
    lesson_id: UUID,
) -> SubmissionOut:
    result = get_submission.execute(user, lesson_id)
    return SubmissionOut.from_entity(result.lesson_id, result.submission, result.grade)
