from uuid import UUID

from app.domain.entities import StudentMaterialView, User
from app.domain.errors import LessonNotFoundError, MaterialNotFoundError
from app.domain.grading import grade
from app.domain.policies import require_student
from app.domain.ports import LessonRepository, MaterialRepository


class GetMyMaterial:
    """Material de refuerzo de una clase del estudiante, con su corrección si ya lo resolvió."""

    def __init__(self, lessons: LessonRepository, materials: MaterialRepository) -> None:
        self._lessons = lessons
        self._materials = materials

    def execute(self, requester: User, lesson_id: UUID) -> StudentMaterialView:
        require_student(requester)
        if not self._lessons.exists_for_student(requester.id, lesson_id):
            raise LessonNotFoundError
        found = self._materials.get_for_lesson(lesson_id)
        if found is None:
            raise MaterialNotFoundError
        material, submission = found
        return StudentMaterialView(
            lesson_id=lesson_id,
            material=material,
            submission=submission,
            grade=grade(material, submission.answers) if submission else None,
        )
