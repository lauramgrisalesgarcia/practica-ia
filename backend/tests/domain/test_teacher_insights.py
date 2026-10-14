from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from app.domain.entities import InsightActivityType, MaterialStatusCounts
from app.domain.teacher_insights import build_teacher_insights
from tests.domain.fakes import make_insight_lesson

# Lunes 12 de octubre de 2026, a mediodía (UTC)
NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def at(year: int, month: int, day: int, hour: int = 16) -> datetime:
    return datetime(year, month, day, hour, 0, tzinfo=UTC)


def test_sin_clases_todo_esta_a_cero() -> None:
    insights = build_teacher_insights([], NOW)

    assert insights.lessons_this_month == 0
    assert insights.pending_materials == 0
    assert insights.material_status == MaterialStatusCounts(completed=0, pending=0, none=0)
    assert [week.count for week in insights.weekly_lessons] == [0] * 8
    assert insights.recent_activity == ()
    assert insights.calendar == ()


def test_cuenta_las_clases_del_mes_actual_en_utc() -> None:
    lessons = [
        make_insight_lesson(date=at(2026, 10, 1, 0)),
        make_insight_lesson(date=at(2026, 10, 8)),
        make_insight_lesson(date=at(2026, 9, 30, 23)),
    ]

    assert build_teacher_insights(lessons, NOW).lessons_this_month == 2


def test_clasifica_el_estado_del_material_de_cada_clase() -> None:
    lessons = [
        make_insight_lesson(date=at(2026, 10, 1)),
        make_insight_lesson(date=at(2026, 10, 2), material_generated_at=at(2026, 10, 3)),
        make_insight_lesson(date=at(2026, 10, 4), material_generated_at=at(2026, 10, 5)),
        make_insight_lesson(
            date=at(2026, 10, 6), material_generated_at=at(2026, 10, 7), submitted_at=at(2026, 10, 8), score=Decimal(50)
        ),
    ]

    insights = build_teacher_insights(lessons, NOW)

    assert insights.material_status == MaterialStatusCounts(completed=1, pending=2, none=1)
    assert insights.pending_materials == 2


def test_agrupa_las_clases_de_las_ultimas_8_semanas_por_lunes() -> None:
    lessons = [
        make_insight_lesson(date=at(2026, 10, 12, 9)),  # semana actual (lunes)
        make_insight_lesson(date=at(2026, 10, 11, 23)),  # domingo: semana anterior
        make_insight_lesson(date=at(2026, 10, 5, 0)),  # lunes de la semana anterior
        make_insight_lesson(date=at(2026, 8, 17)),  # semana 8: fuera de la ventana
    ]

    weekly = build_teacher_insights(lessons, NOW).weekly_lessons

    assert [week.week_start for week in weekly] == [date(2026, 10, 12) - timedelta(weeks=n) for n in range(7, -1, -1)]
    assert [week.count for week in weekly] == [0, 0, 0, 0, 0, 0, 2, 1]


def test_la_actividad_reciente_incluye_clase_material_y_entrega_de_la_mas_reciente_a_la_mas_antigua() -> None:
    lesson_id = uuid4()
    lesson = make_insight_lesson(
        date=at(2026, 10, 8),
        lesson_id=lesson_id,
        material_generated_at=at(2026, 10, 9),
        submitted_at=at(2026, 10, 10),
        score=Decimal("66.67"),
    )

    activity = build_teacher_insights([lesson], NOW).recent_activity

    assert [(item.type, item.date, item.score) for item in activity] == [
        (InsightActivityType.SUBMISSION, at(2026, 10, 10), Decimal("66.67")),
        (InsightActivityType.MATERIAL, at(2026, 10, 9), None),
        (InsightActivityType.LESSON, at(2026, 10, 8), None),
    ]
    assert {(item.lesson_id, item.student_name, item.topic) for item in activity} == {
        (lesson_id, "Emma Schmidt", "Pedir en un restaurante")
    }


def test_la_actividad_reciente_se_limita_a_las_10_ultimas() -> None:
    lessons = [make_insight_lesson(date=at(2026, 9, day)) for day in range(1, 13)]

    activity = build_teacher_insights(lessons, NOW).recent_activity

    assert [item.date for item in activity] == [at(2026, 9, day) for day in range(12, 2, -1)]


def test_el_calendario_incluye_las_clases_de_los_ultimos_6_meses_en_orden_cronologico() -> None:
    lessons = [
        make_insight_lesson(date=at(2026, 10, 8), topic="Restaurante"),
        make_insight_lesson(date=at(2026, 5, 1, 0), topic="Presentarse"),
        make_insight_lesson(date=at(2026, 4, 30, 23), topic="Fuera de la ventana"),
    ]

    calendar = build_teacher_insights(lessons, NOW).calendar

    assert [(item.start, item.topic) for item in calendar] == [
        (at(2026, 5, 1, 0), "Presentarse"),
        (at(2026, 10, 8), "Restaurante"),
    ]
    assert calendar[0].student_name == "Emma Schmidt"
