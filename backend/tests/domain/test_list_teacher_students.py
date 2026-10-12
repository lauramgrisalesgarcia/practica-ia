import pytest

from app.domain.entities import Role
from app.domain.errors import AccessDeniedError
from app.domain.use_cases.list_teacher_students import ListTeacherStudents
from tests.domain.fakes import InMemoryStudentRepository, make_student, make_user, uid


def test_devuelve_los_estudiantes_del_docente() -> None:
    teacher = make_user(user_id=uid(1), role=Role.DOCENTE)
    students = [make_student(student_id=uid(10)), make_student(student_id=uid(11), email="john@correo.com")]
    use_case = ListTeacherStudents(students=InMemoryStudentRepository({uid(1): students}))

    assert use_case.execute(teacher) == students


def test_no_devuelve_estudiantes_de_otros_docentes() -> None:
    teacher = make_user(user_id=uid(1), role=Role.DOCENTE)
    use_case = ListTeacherStudents(students=InMemoryStudentRepository({uid(2): [make_student()]}))

    assert use_case.execute(teacher) == []


def test_un_estudiante_no_puede_ver_la_lista() -> None:
    student = make_user(user_id=uid(10), role=Role.ESTUDIANTE)
    use_case = ListTeacherStudents(students=InMemoryStudentRepository())

    with pytest.raises(AccessDeniedError):
        use_case.execute(student)
