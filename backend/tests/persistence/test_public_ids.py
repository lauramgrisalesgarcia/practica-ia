from uuid import UUID

from sqlalchemy.orm import Session

from tests.factories import create_lesson, create_student, create_user


def test_cada_usuario_tiene_un_uuid_publico_aleatorio(db_session: Session) -> None:
    first = create_user(db_session, email="uno@colegio.edu")
    second = create_user(db_session, email="dos@colegio.edu")

    assert isinstance(first.public_id, UUID)
    assert first.public_id.version == 4
    assert first.public_id != second.public_id


def test_cada_clase_tiene_un_uuid_publico_aleatorio(db_session: Session) -> None:
    from datetime import UTC, datetime

    teacher = create_user(db_session)
    student = create_student(db_session, teacher=teacher)
    lesson = create_lesson(db_session, student=student, teacher=teacher, date=datetime.now(UTC))

    assert isinstance(lesson.public_id, UUID)
    assert lesson.public_id.version == 4
