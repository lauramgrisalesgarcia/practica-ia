"""Raíz de composición: crea las implementaciones concretas y las inyecta en los casos de uso.

Es el único lugar que conoce a la vez la persistencia y el dominio. La capa de transporte
solo pide casos de uso ya construidos.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.clock import SystemClock
from app.core.config import get_settings
from app.core.password_hasher import Argon2PasswordHasher
from app.domain.ports import (
    FileStorage,
    LessonRepository,
    LLMClient,
    MaterialRepository,
    StudentRepository,
    UserRepository,
)
from app.domain.use_cases.generate_material import GenerateMaterial
from app.domain.use_cases.authenticate_user import AuthenticateUser
from app.domain.use_cases.get_my_lesson_pdf import GetMyLessonPdf
from app.domain.use_cases.get_my_material import GetMyMaterial
from app.domain.use_cases.get_teacher_lesson import GetTeacherLesson
from app.domain.use_cases.get_teacher_lesson_pdf import GetTeacherLessonPdf
from app.domain.use_cases.get_teacher_student import GetTeacherStudent
from app.domain.use_cases.get_user import GetUser
from app.domain.use_cases.list_my_lessons import ListMyLessons
from app.domain.use_cases.submit_material import SubmitMaterial
from app.domain.use_cases.list_student_lessons import ListStudentLessons
from app.domain.use_cases.list_teacher_students import ListTeacherStudents
from app.persistence.database import get_session
from app.persistence.file_storage import LocalFileStorage
from app.llm.simulated import SimulatedLLMClient
from app.persistence.repositories.lesson_repository import SqlAlchemyLessonRepository
from app.persistence.repositories.material_repository import SqlAlchemyMaterialRepository
from app.persistence.repositories.student_repository import SqlAlchemyStudentRepository
from app.persistence.repositories.user_repository import SqlAlchemyUserRepository


def get_user_repository(session: Annotated[Session, Depends(get_session)]) -> UserRepository:
    return SqlAlchemyUserRepository(session)


def get_student_repository(session: Annotated[Session, Depends(get_session)]) -> StudentRepository:
    return SqlAlchemyStudentRepository(session)


def get_lesson_repository(session: Annotated[Session, Depends(get_session)]) -> LessonRepository:
    return SqlAlchemyLessonRepository(session)


def get_material_repository(session: Annotated[Session, Depends(get_session)]) -> MaterialRepository:
    return SqlAlchemyMaterialRepository(session)


def get_llm_client() -> LLMClient:
    # LLM simulado: se sustituye por un cliente real aquí, sin tocar el dominio.
    return SimulatedLLMClient()


def get_file_storage() -> FileStorage:
    return LocalFileStorage(get_settings().storage_dir)


def get_authenticate_user(users: Annotated[UserRepository, Depends(get_user_repository)]) -> AuthenticateUser:
    return AuthenticateUser(users=users, password_hasher=Argon2PasswordHasher())


def get_get_user(users: Annotated[UserRepository, Depends(get_user_repository)]) -> GetUser:
    return GetUser(users=users)


def get_list_teacher_students(
    students: Annotated[StudentRepository, Depends(get_student_repository)],
) -> ListTeacherStudents:
    return ListTeacherStudents(students=students)


def get_get_teacher_student(
    students: Annotated[StudentRepository, Depends(get_student_repository)],
    lessons: Annotated[LessonRepository, Depends(get_lesson_repository)],
) -> GetTeacherStudent:
    return GetTeacherStudent(students=students, lessons=lessons, clock=SystemClock())


def get_list_student_lessons(
    students: Annotated[StudentRepository, Depends(get_student_repository)],
    lessons: Annotated[LessonRepository, Depends(get_lesson_repository)],
) -> ListStudentLessons:
    return ListStudentLessons(students=students, lessons=lessons, clock=SystemClock())


def get_get_teacher_lesson(lessons: Annotated[LessonRepository, Depends(get_lesson_repository)]) -> GetTeacherLesson:
    return GetTeacherLesson(lessons=lessons)


def get_get_teacher_lesson_pdf(
    lessons: Annotated[LessonRepository, Depends(get_lesson_repository)],
    files: Annotated[FileStorage, Depends(get_file_storage)],
) -> GetTeacherLessonPdf:
    return GetTeacherLessonPdf(lessons=lessons, files=files)


def get_generate_material(
    lessons: Annotated[LessonRepository, Depends(get_lesson_repository)],
    materials: Annotated[MaterialRepository, Depends(get_material_repository)],
    llm: Annotated[LLMClient, Depends(get_llm_client)],
) -> GenerateMaterial:
    return GenerateMaterial(lessons=lessons, materials=materials, llm=llm, clock=SystemClock())


def get_list_my_lessons(lessons: Annotated[LessonRepository, Depends(get_lesson_repository)]) -> ListMyLessons:
    return ListMyLessons(lessons=lessons, clock=SystemClock())


def get_get_my_lesson_pdf(
    lessons: Annotated[LessonRepository, Depends(get_lesson_repository)],
    files: Annotated[FileStorage, Depends(get_file_storage)],
) -> GetMyLessonPdf:
    return GetMyLessonPdf(lessons=lessons, files=files)


def get_get_my_material(
    lessons: Annotated[LessonRepository, Depends(get_lesson_repository)],
    materials: Annotated[MaterialRepository, Depends(get_material_repository)],
) -> GetMyMaterial:
    return GetMyMaterial(lessons=lessons, materials=materials)


def get_submit_material(
    lessons: Annotated[LessonRepository, Depends(get_lesson_repository)],
    materials: Annotated[MaterialRepository, Depends(get_material_repository)],
    llm: Annotated[LLMClient, Depends(get_llm_client)],
) -> SubmitMaterial:
    return SubmitMaterial(lessons=lessons, materials=materials, llm=llm, clock=SystemClock())
