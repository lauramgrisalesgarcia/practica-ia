"""Corrección de un intento. Única fuente de verdad: la usan la vista del material y el envío."""

from collections.abc import Iterable
from decimal import ROUND_HALF_UP, Decimal

from app.domain.entities import Answer, ExerciseResult, Grade, Material

_TWO_DECIMALS = Decimal("0.01")


def grade(material: Material, answers: Iterable[Answer]) -> Grade:
    """Corrige las respuestas contra el material. Todos los ejercicios pesan lo mismo y
    `score` = aciertos / total × 100, redondeado a 2 decimales."""
    selected = {answer.exercise_id: answer.selected_option for answer in answers}
    results = tuple(
        ExerciseResult(
            exercise_id=exercise.id,
            selected_option=selected[exercise.id],
            correct_option=exercise.correct_option,
            is_correct=selected[exercise.id] == exercise.correct_option,
        )
        for exercise in material.exercises
    )
    correct = sum(result.is_correct for result in results)
    score = (Decimal(correct) * 100 / len(results)).quantize(_TWO_DECIMALS, rounding=ROUND_HALF_UP)
    return Grade(results=results, correct_count=correct, incorrect_count=len(results) - correct, score=score)
