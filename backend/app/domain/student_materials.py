from uuid import UUID

from app.domain.entities import Material, Submission, User
from app.domain.errors import LessonNotFoundError, MaterialNotFoundError
from app.domain.policies import require_student
from app.domain.ports import LessonRepository, MaterialRepository


def load_my_material(
    requester: User, lesson_id: UUID, lessons: LessonRepository, materials: MaterialRepository
) -> tuple[Material, Submission | None]:
    """Material de una clase del estudiante y su intento (si lo hay).

    Clase ajena o inexistente → LessonNotFoundError; clase sin material → MaterialNotFoundError.
    """
    require_student(requester)
    if not lessons.exists_for_student(requester.id, lesson_id):
        raise LessonNotFoundError
    found = materials.get_for_lesson(lesson_id)
    if found is None:
        raise MaterialNotFoundError
    return found
