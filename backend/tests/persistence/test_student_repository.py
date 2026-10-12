from sqlalchemy.orm import Session

from app.domain.entities import Level, Student
from app.persistence.repositories.student_repository import SqlAlchemyStudentRepository
from tests.factories import create_student, create_user


def test_devuelve_solo_los_estudiantes_del_docente_como_entidades(db_session: Session) -> None:
    teacher = create_user(db_session, email="docente@colegio.edu")
    other_teacher = create_user(db_session, email="otro@colegio.edu")
    emma = create_student(
        db_session, teacher=teacher, email="emma@correo.com", first_name="Emma", last_name="Schmidt",
        native_language="de", level=Level.A2,
    )
    create_student(db_session, teacher=other_teacher, email="pierre@correo.com")

    students = SqlAlchemyStudentRepository(db_session).list_by_teacher(teacher.id)

    assert students == [
        Student(
            id=emma.id,
            first_name="Emma",
            last_name="Schmidt",
            email="emma@correo.com",
            native_language="de",
            level=Level.A2,
        )
    ]


def test_ordena_por_apellido_y_nombre(db_session: Session) -> None:
    teacher = create_user(db_session)
    create_student(db_session, teacher=teacher, email="b@correo.com", first_name="Emma", last_name="Schmidt")
    create_student(db_session, teacher=teacher, email="c@correo.com", first_name="John", last_name="Miller")
    create_student(db_session, teacher=teacher, email="a@correo.com", first_name="Anna", last_name="Schmidt")

    students = SqlAlchemyStudentRepository(db_session).list_by_teacher(teacher.id)

    assert [(s.last_name, s.first_name) for s in students] == [
        ("Miller", "John"),
        ("Schmidt", "Anna"),
        ("Schmidt", "Emma"),
    ]


def test_devuelve_lista_vacia_si_no_tiene_estudiantes(db_session: Session) -> None:
    teacher = create_user(db_session)

    assert SqlAlchemyStudentRepository(db_session).list_by_teacher(teacher.id) == []
