from fastapi import APIRouter

router = APIRouter(tags=["Sistema"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
