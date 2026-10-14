from uuid import UUID

from app.domain.entities import ActivityType, Material, MaterialGenerationRequest, User
from app.domain.errors import (
    InvalidLLMResponseError,
    LessonNotCompletedError,
    LessonNotFoundError,
    MaterialAlreadyGeneratedError,
)
from app.domain.material_validation import parse_generated_material
from app.domain.policies import require_teacher
from app.domain.ports import Clock, LessonRepository, LLMClient, MaterialRepository


class GenerateMaterial:
    """Genera con el LLM el material de refuerzo de una clase realizada. Se genera una única vez."""

    def __init__(
        self, lessons: LessonRepository, materials: MaterialRepository, llm: LLMClient, clock: Clock
    ) -> None:
        self._lessons = lessons
        self._materials = materials
        self._llm = llm
        self._clock = clock

    def execute(
        self,
        requester: User,
        lesson_id: UUID,
        *,
        activity_type: ActivityType,
        exercise_count: int,
        keywords: list[str] | None,
    ) -> Material:
        require_teacher(requester)
        context = self._lessons.get_generation_context_for_teacher(requester.id, lesson_id)
        if context is None:
            raise LessonNotFoundError
        now = self._clock.now()
        if context.date > now:
            raise LessonNotCompletedError
        if context.has_material:
            raise MaterialAlreadyGeneratedError

        request = MaterialGenerationRequest(
            activity_type=activity_type,
            exercise_count=exercise_count,
            student_level=context.student_level,
            native_language=context.native_language,
            topic=context.topic,
            context=context.context,
            # Las palabras revisadas por el docente solo afectan a esta generación.
            keywords=normalize_keywords(keywords) if keywords is not None else context.keywords,
            notes=context.notes,
            pdf_filename=context.pdf_filename,
            pdf_path=context.pdf_path,
        )
        payload = request.to_llm_payload()
        try:
            response = self._llm.generate_material(payload)
        except Exception as error:  # cualquier fallo del proveedor se trata como respuesta no válida
            raise InvalidLLMResponseError("el LLM no respondió") from error

        material = parse_generated_material(response, request, generated_at=now)
        self._materials.save(lesson_id, payload, material)
        return material


def normalize_keywords(keywords: list[str]) -> tuple[str, ...]:
    """Quita espacios sobrantes y duplicados (sin distinguir mayúsculas), conservando el orden."""
    seen: set[str] = set()
    result: list[str] = []
    for keyword in (" ".join(k.split()) for k in keywords):
        if keyword and keyword.casefold() not in seen:
            seen.add(keyword.casefold())
            result.append(keyword)
    return tuple(result)
