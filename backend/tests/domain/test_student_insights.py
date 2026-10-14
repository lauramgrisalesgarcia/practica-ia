from datetime import UTC, datetime
from decimal import Decimal

from app.domain.entities import InsightActivityType
from app.domain.student_insights import build_student_insights
from tests.domain.fakes import make_student_insight_lesson

# Lunes 12 de octubre de 2026, a mediodía (UTC)
NOW = datetime(2026, 10, 12, 12, 0, tzinfo=UTC)


def at(year: int, month: int, day: int, hour: int = 16) -> datetime:
    return datetime(year, month, day, hour, 0, tzinfo=UTC)


def test_sin_clases_todo_esta_vacio() -> None:
    insights = build_student_insights([], NOW)

    assert insights.lessons_count == 0
    assert insights.completed_materials == 0
    assert insights.average_score is None
    assert insights.pending_materials == ()
    assert insights.recent_activity == ()
    assert insights.calendar == ()
    assert insights.score_history == ()


def test_cuenta_las_clases_y_los_refuerzos_resueltos_con_su_nota_media() -> None:
    lessons = [
        make_student_insight_lesson(date=at(2026, 10, 1)),
        make_student_insight_lesson(
            date=at(2026, 10, 2), material_generated_at=at(2026, 10, 3), submitted_at=at(2026, 10, 4), score=Decimal("50")
        ),
        make_student_insight_lesson(
            date=at(2026, 10, 5), material_generated_at=at(2026, 10, 6), submitted_at=at(2026, 10, 7), score=Decimal("66.67")
        ),
    ]

    insights = build_student_insights(lessons, NOW)

    assert insights.lessons_count == 3
    assert insights.completed_materials == 2
    assert insights.average_score == Decimal("58.34")


def test_lista_los_refuerzos_pendientes_de_la_clase_mas_reciente_a_la_mas_antigua() -> None:
    older = make_student_insight_lesson(
        date=at(2026, 9, 20), topic="Presentarse", material_generated_at=at(2026, 9, 21), exercise_count=3
    )
    recent = make_student_insight_lesson(
        date=at(2026, 10, 8), topic="Restaurante", material_generated_at=at(2026, 10, 9), exercise_count=5
    )
    solved = make_student_insight_lesson(
        date=at(2026, 10, 1), material_generated_at=at(2026, 10, 2), submitted_at=at(2026, 10, 3), score=Decimal(100)
    )
    without_material = make_student_insight_lesson(date=at(2026, 10, 10))

    pending = build_student_insights([older, recent, solved, without_material], NOW).pending_materials

    assert [(item.lesson_id, item.topic, item.date, item.exercise_count) for item in pending] == [
        (recent.id, "Restaurante", at(2026, 10, 8), 5),
        (older.id, "Presentarse", at(2026, 9, 20), 3),
    ]


def test_la_actividad_reciente_incluye_clase_refuerzo_y_entrega_y_se_limita_a_10() -> None:
    solved = make_student_insight_lesson(
        date=at(2026, 10, 8), material_generated_at=at(2026, 10, 9), submitted_at=at(2026, 10, 10), score=Decimal("66.67")
    )
    others = [make_student_insight_lesson(date=at(2026, 9, day)) for day in range(1, 11)]

    activity = build_student_insights([solved, *others], NOW).recent_activity

    assert len(activity) == 10
    assert [(item.type, item.date, item.score) for item in activity[:3]] == [
        (InsightActivityType.SUBMISSION, at(2026, 10, 10), Decimal("66.67")),
        (InsightActivityType.MATERIAL, at(2026, 10, 9), None),
        (InsightActivityType.LESSON, at(2026, 10, 8), None),
    ]
    assert activity[0].lesson_id == solved.id
    assert activity[-1].date == at(2026, 9, 4)


def test_el_calendario_incluye_las_clases_de_los_ultimos_6_meses_en_orden_cronologico() -> None:
    lessons = [
        make_student_insight_lesson(date=at(2026, 10, 8), topic="Restaurante"),
        make_student_insight_lesson(date=at(2026, 5, 1, 0), topic="Presentarse"),
        make_student_insight_lesson(date=at(2026, 4, 30, 23), topic="Fuera de la ventana"),
    ]

    calendar = build_student_insights(lessons, NOW).calendar

    assert [(item.start, item.topic) for item in calendar] == [
        (at(2026, 5, 1, 0), "Presentarse"),
        (at(2026, 10, 8), "Restaurante"),
    ]


def test_la_evolucion_de_la_nota_tiene_los_ultimos_10_refuerzos_resueltos_en_orden_cronologico() -> None:
    lessons = [
        make_student_insight_lesson(
            date=at(2026, 8, day),
            topic=f"Clase {day}",
            material_generated_at=at(2026, 8, day, 17),
            submitted_at=at(2026, 8, day, 18),
            score=Decimal(day * 5),
        )
        for day in range(1, 13)
    ]

    history = build_student_insights(list(reversed(lessons)), NOW).score_history

    assert [(item.topic, item.score) for item in history] == [(f"Clase {day}", Decimal(day * 5)) for day in range(3, 13)]
    assert history[0].submitted_at == at(2026, 8, 3, 18)
