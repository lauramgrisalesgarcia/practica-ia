from uuid import UUID

from app.domain.entities import LessonFile, User
from app.domain.lesson_files import read_lesson_pdf
from app.domain.policies import require_student
from app.domain.ports import FileStorage, LessonRepository


class GetMyLessonPdf:
    """PDF de una clase del estudiante autenticado."""

    def __init__(self, lessons: LessonRepository, files: FileStorage) -> None:
        self._lessons = lessons
        self._files = files

    def execute(self, requester: User, lesson_id: UUID) -> LessonFile:
        require_student(requester)
        return read_lesson_pdf(self._lessons.get_pdf_for_student(requester.id, lesson_id), self._files)
