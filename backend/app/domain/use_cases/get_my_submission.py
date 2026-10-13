from uuid import UUID

from app.domain.entities import GradedSubmission, User
from app.domain.errors import SubmissionNotFoundError
from app.domain.grading import grade
from app.domain.ports import LessonRepository, MaterialRepository
from app.domain.student_materials import load_my_material


class GetMySubmission:
    """Resultado del estudiante para el material de una de sus clases."""

    def __init__(self, lessons: LessonRepository, materials: MaterialRepository) -> None:
        self._lessons = lessons
        self._materials = materials

    def execute(self, requester: User, lesson_id: UUID) -> GradedSubmission:
        material, submission = load_my_material(requester, lesson_id, self._lessons, self._materials)
        if submission is None:
            raise SubmissionNotFoundError
        return GradedSubmission(lesson_id=lesson_id, submission=submission, grade=grade(material, submission.answers))
