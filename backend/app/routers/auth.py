from fastapi import APIRouter, HTTPException, status

from app.config import get_settings
from app.deps import CurrentUser, DbSession
from app.models import User
from app.schemas import LoginRequest, LoginResponse, UserOut
from app.security import create_access_token
from app.services.auth import authenticate

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest, db: DbSession) -> LoginResponse:
    user = authenticate(db, credentials.email, credentials.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas")

    return LoginResponse(
        access_token=create_access_token(user.id),
        expires_in=get_settings().access_token_expire_minutes * 60,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user
