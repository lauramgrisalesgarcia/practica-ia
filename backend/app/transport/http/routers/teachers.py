from typing import Annotated

from fastapi import APIRouter, Depends

from app.composition import get_list_teacher_students
from app.domain.entities import Student
from app.domain.use_cases.list_teacher_students import ListTeacherStudents
from app.transport.http.dependencies import CurrentUser
from app.transport.http.schemas.students import StudentOut

router = APIRouter(prefix="/teachers/me", tags=["Docente"])


@router.get("/students", response_model=list[StudentOut])
def list_my_students(
    user: CurrentUser,
    list_students: Annotated[ListTeacherStudents, Depends(get_list_teacher_students)],
) -> list[Student]:
    return list_students.execute(user)
