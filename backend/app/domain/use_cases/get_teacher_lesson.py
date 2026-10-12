from uuid import UUID

from app.domain.entities import LessonDetail, User
from app.domain.errors import LessonNotFoundError
from app.domain.policies import require_teacher
from app.domain.ports import LessonRepository


class GetTeacherLesson:
    """Detalle de una clase de un estudiante del docente, con su material y resultado."""

    def __init__(self, lessons: LessonRepository) -> None:
        self._lessons = lessons

    def execute(self, requester: User, lesson_id: UUID) -> LessonDetail:
        require_teacher(requester)
        detail = self._lessons.get_detail_for_teacher(requester.id, lesson_id)
        if detail is None:
            raise LessonNotFoundError
        return detail
