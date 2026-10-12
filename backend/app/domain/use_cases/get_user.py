from app.domain.entities import User
from app.domain.ports import UserRepository


class GetUser:
    def __init__(self, users: UserRepository) -> None:
        self._users = users

    def execute(self, user_id: int) -> User | None:
        return self._users.get_by_id(user_id)
