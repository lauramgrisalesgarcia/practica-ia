from uuid import UUID

from app.domain.entities import LessonFile, User
from app.domain.errors import LessonNotFoundError, LessonPdfNotFoundError
from app.domain.policies import require_teacher
from app.domain.ports import FileStorage, LessonRepository


class GetTeacherLessonPdf:
    """PDF de una clase de un estudiante del docente."""

    def __init__(self, lessons: LessonRepository, files: FileStorage) -> None:
        self._lessons = lessons
        self._files = files

    def execute(self, requester: User, lesson_id: UUID) -> LessonFile:
        require_teacher(requester)
        location = self._lessons.get_pdf_for_teacher(requester.id, lesson_id)
        if location is None:
            raise LessonNotFoundError
        content = self._files.read(location.path)
        if content is None:
            raise LessonPdfNotFoundError
        return LessonFile(filename=location.filename, content=content)
