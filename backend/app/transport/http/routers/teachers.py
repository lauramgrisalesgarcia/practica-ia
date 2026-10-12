from typing import Annotated

from fastapi import APIRouter, Depends, Path

from app.composition import get_get_teacher_student, get_list_teacher_students
from app.domain.entities import Student
from app.domain.use_cases.get_teacher_student import GetTeacherStudent
from app.domain.use_cases.list_teacher_students import ListTeacherStudents
from app.transport.http.dependencies import CurrentUser
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
    student_id: Annotated[int, Path(ge=1)],
) -> StudentDetailOut:
    return StudentDetailOut.from_entity(get_student.execute(user, student_id))
