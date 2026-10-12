from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status

from app.composition import (
    get_generate_material,
    get_get_teacher_lesson,
    get_get_teacher_lesson_pdf,
    get_get_teacher_student,
    get_list_student_lessons,
    get_list_teacher_students,
)
from app.domain.entities import LessonSummary, Student
from app.domain.use_cases.generate_material import GenerateMaterial
from app.domain.use_cases.get_teacher_lesson import GetTeacherLesson
from app.domain.use_cases.get_teacher_lesson_pdf import GetTeacherLessonPdf
from app.domain.use_cases.get_teacher_student import GetTeacherStudent
from app.domain.use_cases.list_student_lessons import ListStudentLessons
from app.domain.use_cases.list_teacher_students import ListTeacherStudents
from app.transport.http.dependencies import CurrentUser
from app.transport.http.files import pdf_response
from app.transport.http.schemas.lessons import LessonSummaryOut, TeacherLessonDetailOut
from app.transport.http.schemas.materials import GeneratedMaterialOut, GenerateMaterialIn
from app.transport.http.schemas.students import StudentDetailOut, StudentOut

router = APIRouter(prefix="/teachers/me", tags=["Docente"])


@router.get("/students", response_model=list[StudentOut])
def list_my_students(
    user: CurrentUser,
    list_students: Annotated[ListTeacherStudents, Depends(get_list_teacher_students)],
) -> list[Student]:
    return list_students.execute(user)


@router.get("/students/{student_id}", response_model=StudentDetailOut)
def get_my_student(
    user: CurrentUser,
    get_student: Annotated[GetTeacherStudent, Depends(get_get_teacher_student)],
    student_id: UUID,
) -> StudentDetailOut:
    return StudentDetailOut.from_entity(get_student.execute(user, student_id))


@router.get("/students/{student_id}/lessons", response_model=list[LessonSummaryOut])
def list_my_student_lessons(
    user: CurrentUser,
    list_lessons: Annotated[ListStudentLessons, Depends(get_list_student_lessons)],
    student_id: UUID,
) -> list[LessonSummary]:
    return list_lessons.execute(user, student_id)


@router.get("/lessons/{lesson_id}", response_model=TeacherLessonDetailOut)
def get_my_lesson(
    user: CurrentUser,
    get_lesson: Annotated[GetTeacherLesson, Depends(get_get_teacher_lesson)],
    lesson_id: UUID,
) -> TeacherLessonDetailOut:
    detail = get_lesson.execute(user, lesson_id)
    return TeacherLessonDetailOut.from_entity(detail, pdf_url=f"{router.prefix}/lessons/{lesson_id}/pdf")


@router.get(
    "/lessons/{lesson_id}/pdf",
    response_class=Response,
    responses={200: {"description": "Contenido del PDF de la clase.", "content": {"application/pdf": {}}}},
)
def get_my_lesson_pdf(
    user: CurrentUser,
    get_pdf: Annotated[GetTeacherLessonPdf, Depends(get_get_teacher_lesson_pdf)],
    lesson_id: UUID,
) -> Response:
    return pdf_response(get_pdf.execute(user, lesson_id))


@router.post(
    "/lessons/{lesson_id}/material",
    response_model=GeneratedMaterialOut,
    status_code=status.HTTP_201_CREATED,
)
def generate_material(
    user: CurrentUser,
    generate: Annotated[GenerateMaterial, Depends(get_generate_material)],
    lesson_id: UUID,
    body: GenerateMaterialIn,
) -> GeneratedMaterialOut:
    material = generate.execute(
        user,
        lesson_id,
        activity_type=body.activity_type,
        exercise_count=body.exercise_count,
        keywords=body.keywords,
    )
    return GeneratedMaterialOut.from_material(lesson_id, material)
