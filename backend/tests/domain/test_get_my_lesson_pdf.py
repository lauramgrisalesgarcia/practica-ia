import pytest

from app.domain.entities import LessonFile, Role
from app.domain.errors import AccessDeniedError, LessonNotFoundError, LessonPdfNotFoundError
from app.domain.use_cases.get_my_lesson_pdf import GetMyLessonPdf
from tests.domain.fakes import InMemoryFileStorage, InMemoryLessonRepository, make_user, uid

EMMA = make_user(user_id=uid(10), role=Role.ESTUDIANTE)
LESSON_ID = uid(100)
PDF_PATH = "lessons/10/restaurante-a2.pdf"


def build(files: dict[str, bytes] | None = None) -> GetMyLessonPdf:
    return GetMyLessonPdf(
        lessons=InMemoryLessonRepository(pdfs_by_student={EMMA.id: {LESSON_ID: ("restaurante-a2.pdf", PDF_PATH)}}),
        files=InMemoryFileStorage(files if files is not None else {PDF_PATH: b"%PDF-1.4"}),
    )


def test_devuelve_el_pdf_de_una_de_mis_clases() -> None:
    assert build().execute(EMMA, LESSON_ID) == LessonFile(filename="restaurante-a2.pdf", content=b"%PDF-1.4")


def test_una_clase_de_otro_estudiante_no_se_encuentra() -> None:
    with pytest.raises(LessonNotFoundError):
        build().execute(make_user(user_id=uid(11), role=Role.ESTUDIANTE), LESSON_ID)


def test_si_falta_el_archivo_se_indica_que_el_pdf_no_esta_disponible() -> None:
    with pytest.raises(LessonPdfNotFoundError):
        build(files={}).execute(EMMA, LESSON_ID)


def test_un_docente_no_usa_la_descarga_del_estudiante() -> None:
    with pytest.raises(AccessDeniedError):
        build().execute(make_user(user_id=uid(1), role=Role.DOCENTE), LESSON_ID)
