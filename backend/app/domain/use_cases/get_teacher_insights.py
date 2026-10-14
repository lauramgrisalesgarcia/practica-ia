from app.domain.entities import TeacherInsights, User
from app.domain.policies import require_teacher
from app.domain.ports import Clock, TeacherInsightsRepository
from app.domain.teacher_insights import build_teacher_insights


class GetTeacherInsights:
    """Indicadores del panel del docente, calculados con sus clases ya realizadas."""

    def __init__(self, insights: TeacherInsightsRepository, clock: Clock) -> None:
        self._insights = insights
        self._clock = clock

    def execute(self, requester: User) -> TeacherInsights:
        require_teacher(requester)
        now = self._clock.now()
        return build_teacher_insights(self._insights.list_completed_by_teacher(requester.id, until=now), now)
