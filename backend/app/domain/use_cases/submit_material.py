from typing import Any
from uuid import UUID

from app.domain.entities import Answer, Grade, GradedSubmission, LessonContext, Material, Submission, User
from app.domain.errors import (
    InvalidAnswersError,
    InvalidRecommendationsError,
    LessonNotFoundError,
    MaterialNotFoundError,
    SubmissionAlreadyExistsError,
)
from app.domain.grading import grade
from app.domain.policies import require_student
from app.domain.ports import Clock, LessonRepository, LLMClient, MaterialRepository
from app.domain.recommendation_validation import parse_recommendations


class SubmitMaterial:
    """El estudiante resuelve el material una única vez: se corrige, se piden recomendaciones
    al LLM y se guarda el intento. Si algo falla antes de guardar, el intento no se consume."""

    def __init__(
        self, lessons: LessonRepository, materials: MaterialRepository, llm: LLMClient, clock: Clock
    ) -> None:
        self._lessons = lessons
        self._materials = materials
        self._llm = llm
        self._clock = clock

    def execute(self, requester: User, lesson_id: UUID, answers: list[Answer]) -> GradedSubmission:
        require_student(requester)
        context = self._lessons.get_context_for_student(requester.id, lesson_id)
        if context is None:
            raise LessonNotFoundError
        found = self._materials.get_for_lesson(lesson_id)
        if found is None:
            raise MaterialNotFoundError
        material, previous = found
        if previous is not None:
            raise SubmissionAlreadyExistsError
        validate_answers(material, answers)

        result = grade(material, answers)
        try:
            response = self._llm.generate_recommendations(_recommendations_request(context, material, result))
        except Exception as error:  # cualquier fallo del proveedor: el intento no se consume
            raise InvalidRecommendationsError("el LLM no respondió") from error
        feedback, recommendations = parse_recommendations(response)

        submission = Submission(
            submitted_at=self._clock.now(),
            answers=tuple(answers),
            correct_count=result.correct_count,
            incorrect_count=result.incorrect_count,
            score=result.score,
            feedback=feedback,
            recommendations=recommendations,
        )
        self._materials.save_submission(lesson_id, requester.id, submission)
        return GradedSubmission(lesson_id=lesson_id, submission=submission, grade=result)


def validate_answers(material: Material, answers: list[Answer]) -> None:
    """Una respuesta por ejercicio, sin repetidos ni ejercicios inexistentes, con opciones que existen."""
    options_by_exercise = {exercise.id: exercise.options for exercise in material.exercises}
    answered = [answer.exercise_id for answer in answers]
    if sorted(answered) != sorted(options_by_exercise):
        raise InvalidAnswersError
    if any(answer.selected_option not in options_by_exercise[answer.exercise_id] for answer in answers):
        raise InvalidAnswersError


def _recommendations_request(context: LessonContext, material: Material, result: Grade) -> dict[str, Any]:
    sentences = {exercise.id: exercise.sentence for exercise in material.exercises}
    return {
        "task": "generate_recommendations",
        "student": {"level": context.student_level.value, "native_language": context.native_language},
        "lesson": {"topic": context.topic, "context": context.context, "keywords": list(context.keywords)},
        "result": {
            "correct_count": result.correct_count,
            "incorrect_count": result.incorrect_count,
            "score": float(result.score),
            "failed_exercises": [
                {
                    "sentence": sentences[item.exercise_id],
                    "selected_option": item.selected_option,
                    "correct_option": item.correct_option,
                }
                for item in result.results
                if not item.is_correct
            ],
        },
        "output_language": "es",
    }
