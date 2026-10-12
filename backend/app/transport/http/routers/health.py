from fastapi import APIRouter

from app.transport.http.schemas.health import HealthOut

router = APIRouter(tags=["Sistema"])


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut(status="ok")
