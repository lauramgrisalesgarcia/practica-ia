import secrets
from datetime import timedelta

import jwt
import pytest

from app.core.tokens import InvalidTokenError, create_access_token, decode_access_token


def test_el_token_identifica_al_usuario() -> None:
    token = create_access_token(user_id=7)

    assert decode_access_token(token) == 7


def test_rechaza_un_token_caducado() -> None:
    token = create_access_token(user_id=7, expires_delta=timedelta(seconds=-1))

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_rechaza_un_token_firmado_con_otra_clave() -> None:
    token = jwt.encode({"sub": "7"}, secrets.token_urlsafe(32), algorithm="HS256")

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)
