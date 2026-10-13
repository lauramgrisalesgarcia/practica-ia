from uuid import UUID

from app.domain.entities import StudentMaterialView, User
from app.domain.grading import grade
from app.domain.ports import LessonRepository, MaterialRepository
from app.domain.student_materials import load_my_material


class GetMyMaterial:
    """Material de refuerzo de una clase del estudiante, con su corrección si ya lo resolvió."""

    def __init__(self, lessons: LessonRepository, materials: MaterialRepository) -> None:
        self._lessons = lessons
        self._materials = materials

    def execute(self, requester: User, lesson_id: UUID) -> StudentMaterialView:
        material, submission = load_my_material(requester, lesson_id, self._lessons, self._materials)
        return StudentMaterialView(
            lesson_id=lesson_id,
            material=material,
            submission=submission,
            grade=grade(material, submission.answers) if submission else None,
        )
