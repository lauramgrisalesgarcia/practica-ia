"""Cálculo de los indicadores del panel del estudiante a partir de sus clases realizadas (UTC)."""

from collections.abc import Iterator, Sequence
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from app.domain.entities import (
    InsightActivityType,
    PendingMaterial,
    ScorePoint,
    StudentActivity,
    StudentCalendarLesson,
    StudentInsightLesson,
    StudentInsights,
)
from app.domain.periods import month_start

RECENT_ACTIVITY_LIMIT = 10
CALENDAR_MONTHS = 6
SCORE_HISTORY_LIMIT = 10


def _average(scores: Sequence[Decimal]) -> Decimal | None:
    if not scores:
        return None
    return (sum(scores, Decimal(0)) / len(scores)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _pending(lessons: Sequence[StudentInsightLesson]) -> tuple[PendingMaterial, ...]:
    return tuple(
        PendingMaterial(lesson_id=lesson.id, topic=lesson.topic, date=lesson.date, exercise_count=lesson.exercise_count)
        for lesson in sorted(lessons, key=lambda lesson: lesson.date, reverse=True)
        if lesson.exercise_count is not None and lesson.submitted_at is None
    )


def _activities(lesson: StudentInsightLesson) -> Iterator[StudentActivity]:
    def activity(kind: InsightActivityType, moment: datetime) -> StudentActivity:
        score = lesson.score if kind is InsightActivityType.SUBMISSION else None
        return StudentActivity(type=kind, date=moment, lesson_id=lesson.id, topic=lesson.topic, score=score)

    yield activity(InsightActivityType.LESSON, lesson.date)
    if lesson.material_generated_at is not None:
        yield activity(InsightActivityType.MATERIAL, lesson.material_generated_at)
    if lesson.submitted_at is not None:
        yield activity(InsightActivityType.SUBMISSION, lesson.submitted_at)


def _recent_activity(lessons: Sequence[StudentInsightLesson]) -> tuple[StudentActivity, ...]:
    activities = [item for lesson in lessons for item in _activities(lesson)]
    activities.sort(key=lambda item: item.date, reverse=True)
    return tuple(activities[:RECENT_ACTIVITY_LIMIT])


def _calendar(lessons: Sequence[StudentInsightLesson], now: datetime) -> tuple[StudentCalendarLesson, ...]:
    since = month_start(now, CALENDAR_MONTHS - 1)
    return tuple(
        StudentCalendarLesson(lesson_id=lesson.id, start=lesson.date, topic=lesson.topic)
        for lesson in sorted(lessons, key=lambda lesson: lesson.date)
        if lesson.date >= since
    )


def _score_history(lessons: Sequence[StudentInsightLesson]) -> tuple[ScorePoint, ...]:
    points = sorted(
        (
            ScorePoint(lesson_id=lesson.id, topic=lesson.topic, submitted_at=lesson.submitted_at, score=lesson.score)
            for lesson in lessons
            if lesson.submitted_at is not None and lesson.score is not None
        ),
        key=lambda point: point.submitted_at,
    )
    return tuple(points[-SCORE_HISTORY_LIMIT:])


def build_student_insights(lessons: Sequence[StudentInsightLesson], now: datetime) -> StudentInsights:
    """Indicadores a partir de las clases ya realizadas (fecha anterior o igual a `now`)."""
    scores = [lesson.score for lesson in lessons if lesson.submitted_at is not None and lesson.score is not None]
    return StudentInsights(
        lessons_count=len(lessons),
        completed_materials=len(scores),
        average_score=_average(scores),
        pending_materials=_pending(lessons),
        recent_activity=_recent_activity(lessons),
        calendar=_calendar(lessons, now),
        score_history=_score_history(lessons),
    )
