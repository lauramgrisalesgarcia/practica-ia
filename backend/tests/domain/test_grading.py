from datetime import UTC, datetime
from decimal import Decimal

from app.domain.entities import ActivityType, Answer, Exercise, ExerciseResult, Material
from app.domain.grading import grade


def make_material(count: int) -> Material:
    return Material(
        generated_at=datetime(2026, 10, 12, tzinfo=UTC),
        activity_type=ActivityType.COMPLETE_SENTENCE,
        exercise_count=count,
        title="En el restaurante",
        instructions="Completa cada frase.",
        exercises=tuple(
            Exercise(id=n, sentence=f"Frase ___ {n}", options=("bien", "mal"), correct_option="bien")
            for n in range(1, count + 1)
        ),
    )


def test_todas_correctas_es_100() -> None:
    result = grade(make_material(2), [Answer(1, "bien"), Answer(2, "bien")])

    assert (result.correct_count, result.incorrect_count, result.score) == (2, 0, Decimal("100.00"))


def test_el_porcentaje_se_redondea_a_dos_decimales() -> None:
    result = grade(make_material(3), [Answer(1, "bien"), Answer(2, "bien"), Answer(3, "mal")])

    assert (result.correct_count, result.incorrect_count, result.score) == (2, 1, Decimal("66.67"))


def test_ninguna_correcta_es_0() -> None:
    result = grade(make_material(1), [Answer(1, "mal")])

    assert result.score == Decimal("0.00")


def test_detalla_el_resultado_de_cada_ejercicio_en_el_orden_del_material() -> None:
    result = grade(make_material(2), [Answer(2, "mal"), Answer(1, "bien")])

    assert result.results == (
        ExerciseResult(exercise_id=1, selected_option="bien", correct_option="bien", is_correct=True),
        ExerciseResult(exercise_id=2, selected_option="mal", correct_option="bien", is_correct=False),
    )
