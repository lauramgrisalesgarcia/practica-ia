"""Cálculo de los indicadores del panel del docente a partir de sus clases realizadas (UTC)."""

from collections import Counter
from collections.abc import Iterator, Sequence
from datetime import UTC, date, datetime, timedelta

from app.domain.entities import (
    CalendarLesson,
    InsightActivityType,
    InsightLesson,
    MaterialStatusCounts,
    RecentActivity,
    TeacherInsights,
    WeeklyCount,
)
from app.domain.periods import month_start

WEEKS = 8
RECENT_ACTIVITY_LIMIT = 10
CALENDAR_MONTHS = 6


def _monday(moment: datetime) -> date:
    day = moment.astimezone(UTC).date()
    return day - timedelta(days=day.weekday())


def _material_status(lessons: Sequence[InsightLesson]) -> MaterialStatusCounts:
    completed = sum(1 for lesson in lessons if lesson.submitted_at is not None)
    with_material = sum(1 for lesson in lessons if lesson.material_generated_at is not None)
    return MaterialStatusCounts(completed=completed, pending=with_material - completed, none=len(lessons) - with_material)


def _weekly_lessons(lessons: Sequence[InsightLesson], now: datetime) -> tuple[WeeklyCount, ...]:
    current = _monday(now)
    counts = Counter(_monday(lesson.date) for lesson in lessons)
    weeks = [current - timedelta(weeks=n) for n in range(WEEKS - 1, -1, -1)]
    return tuple(WeeklyCount(week_start=week, count=counts[week]) for week in weeks)


def _activities(lesson: InsightLesson) -> Iterator[RecentActivity]:
    def activity(kind: InsightActivityType, moment: datetime) -> RecentActivity:
        return RecentActivity(
            type=kind,
            date=moment,
            lesson_id=lesson.id,
            student_name=lesson.student_name,
            topic=lesson.topic,
            score=lesson.score if kind is InsightActivityType.SUBMISSION else None,
        )

    yield activity(InsightActivityType.LESSON, lesson.date)
    if lesson.material_generated_at is not None:
        yield activity(InsightActivityType.MATERIAL, lesson.material_generated_at)
    if lesson.submitted_at is not None:
        yield activity(InsightActivityType.SUBMISSION, lesson.submitted_at)


def _recent_activity(lessons: Sequence[InsightLesson]) -> tuple[RecentActivity, ...]:
    activities = [item for lesson in lessons for item in _activities(lesson)]
    activities.sort(key=lambda item: item.date, reverse=True)
    return tuple(activities[:RECENT_ACTIVITY_LIMIT])


def _calendar(lessons: Sequence[InsightLesson], now: datetime) -> tuple[CalendarLesson, ...]:
    since = month_start(now, CALENDAR_MONTHS - 1)
    return tuple(
        CalendarLesson(lesson_id=lesson.id, start=lesson.date, student_name=lesson.student_name, topic=lesson.topic)
        for lesson in sorted(lessons, key=lambda lesson: lesson.date)
        if lesson.date >= since
    )


def build_teacher_insights(lessons: Sequence[InsightLesson], now: datetime) -> TeacherInsights:
    """Indicadores a partir de las clases ya realizadas (fecha anterior o igual a `now`)."""
    this_month = month_start(now)
    status = _material_status(lessons)
    return TeacherInsights(
        lessons_this_month=sum(1 for lesson in lessons if lesson.date >= this_month),
        pending_materials=status.pending,
        material_status=status,
        weekly_lessons=_weekly_lessons(lessons, now),
        recent_activity=_recent_activity(lessons),
        calendar=_calendar(lessons, now),
    )
