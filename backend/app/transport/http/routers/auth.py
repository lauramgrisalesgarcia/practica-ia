from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.composition import get_authenticate_user
from app.core.config import get_settings
from app.core.tokens import create_access_token
from app.domain.entities import User
from app.domain.errors import InvalidCredentialsError
from app.domain.use_cases.authenticate_user import AuthenticateUser
from app.transport.http.dependencies import CurrentUser
from app.transport.http.schemas.auth import LoginRequest, LoginResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=LoginResponse)
def login(
    credentials: LoginRequest,
    authenticate: Annotated[AuthenticateUser, Depends(get_authenticate_user)],
) -> LoginResponse:
    try:
        user = authenticate.execute(credentials.email, credentials.password)
    except InvalidCredentialsError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales incorrectas") from None

    return LoginResponse(
        access_token=create_access_token(user.id),
        expires_in=get_settings().access_token_expire_minutes * 60,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user
