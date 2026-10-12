from app.domain.entities import LessonFile, LessonPdfLocation
from app.domain.errors import LessonNotFoundError, LessonPdfNotFoundError
from app.domain.ports import FileStorage


def read_lesson_pdf(location: LessonPdfLocation | None, files: FileStorage) -> LessonFile:
    """Contenido del PDF de una clase. Sin ubicación (clase ajena o inexistente) → LessonNotFoundError;
    sin archivo en el almacenamiento → LessonPdfNotFoundError."""
    if location is None:
        raise LessonNotFoundError
    content = files.read(location.path)
    if content is None:
        raise LessonPdfNotFoundError
    return LessonFile(filename=location.filename, content=content)
