from app.domain.entities import StudentInsights, User
from app.domain.policies import require_student
from app.domain.ports import Clock, StudentInsightsRepository
from app.domain.student_insights import build_student_insights


class GetStudentInsights:
    """Indicadores del panel del estudiante, calculados con sus clases ya realizadas."""

    def __init__(self, insights: StudentInsightsRepository, clock: Clock) -> None:
        self._insights = insights
        self._clock = clock

    def execute(self, requester: User) -> StudentInsights:
        require_student(requester)
        now = self._clock.now()
        return build_student_insights(self._insights.list_completed_by_student(requester.id, until=now), now)
