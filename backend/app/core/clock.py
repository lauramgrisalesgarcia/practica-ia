from datetime import UTC, datetime

from app.domain.ports import Clock


class SystemClock(Clock):
    def now(self) -> datetime:
        return datetime.now(UTC)
