import pytest

from app.domain.entities import LessonFile, Role
from app.domain.errors import AccessDeniedError, LessonNotFoundError, LessonPdfNotFoundError
from app.domain.use_cases.get_teacher_lesson_pdf import GetTeacherLessonPdf
from tests.domain.fakes import InMemoryFileStorage, InMemoryLessonRepository, make_user, uid

TEACHER = make_user(user_id=uid(1), role=Role.DOCENTE)
LESSON_ID = uid(100)
PDF_PATH = "lessons/10/restaurante-a2.pdf"


def build(files: dict[str, bytes] | None = None) -> GetTeacherLessonPdf:
    return GetTeacherLessonPdf(
        lessons=InMemoryLessonRepository(
            pdfs_by_teacher={TEACHER.id: {LESSON_ID: ("restaurante-a2.pdf", PDF_PATH)}}
        ),
        files=InMemoryFileStorage(files if files is not None else {PDF_PATH: b"%PDF-1.4"}),
    )


def test_devuelve_el_nombre_y_el_contenido_del_pdf() -> None:
    assert build().execute(TEACHER, LESSON_ID) == LessonFile(filename="restaurante-a2.pdf", content=b"%PDF-1.4")


def test_una_clase_de_otro_docente_no_se_encuentra() -> None:
    with pytest.raises(LessonNotFoundError):
        build().execute(make_user(user_id=uid(2), role=Role.DOCENTE), LESSON_ID)


def test_si_falta_el_archivo_se_indica_que_el_pdf_no_esta_disponible() -> None:
    with pytest.raises(LessonPdfNotFoundError):
        build(files={}).execute(TEACHER, LESSON_ID)


def test_un_estudiante_no_puede_descargarlo_desde_el_panel_del_docente() -> None:
    with pytest.raises(AccessDeniedError):
        build().execute(make_user(user_id=uid(10), role=Role.ESTUDIANTE), LESSON_ID)
