from app.domain.entities import LessonSummary, User
from app.domain.policies import require_student
from app.domain.ports import Clock, LessonRepository


class ListMyLessons:
    """Historial de clases realizadas del estudiante autenticado."""

    def __init__(self, lessons: LessonRepository, clock: Clock) -> None:
        self._lessons = lessons
        self._clock = clock

    def execute(self, requester: User) -> list[LessonSummary]:
        require_student(requester)
        return self._lessons.list_completed_by_student(requester.id, until=self._clock.now())
