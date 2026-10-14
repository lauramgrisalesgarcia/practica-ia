from uuid import UUID

from app.domain.entities import LessonSummary, User
from app.domain.errors import LessonNotFoundError
from app.domain.policies import require_student
from app.domain.ports import LessonRepository


class GetMyLesson:
    """Detalle de una clase del estudiante autenticado (sin las notas del docente)."""

    def __init__(self, lessons: LessonRepository) -> None:
        self._lessons = lessons

    def execute(self, requester: User, lesson_id: UUID) -> LessonSummary:
        require_student(requester)
        lesson = self._lessons.get_summary_for_student(requester.id, lesson_id)
        if lesson is None:
            raise LessonNotFoundError
        return lesson
