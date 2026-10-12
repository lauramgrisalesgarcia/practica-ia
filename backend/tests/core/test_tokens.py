import secrets
from datetime import timedelta
from uuid import uuid4

import jwt
import pytest

from app.core.config import get_settings
from app.core.tokens import InvalidTokenError, create_access_token, decode_access_token


def test_el_token_identifica_al_usuario_por_su_uuid_publico() -> None:
    user_id = uuid4()
    token = create_access_token(user_id=user_id)

    assert decode_access_token(token) == user_id


def test_rechaza_un_token_cuyo_sujeto_no_es_un_uuid() -> None:
    """Un token antiguo con id numérico, aunque esté bien firmado, ya no es válido."""
    secret = get_settings().jwt_secret.get_secret_value()
    token = jwt.encode({"sub": "7"}, secret, algorithm="HS256")

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_rechaza_un_token_caducado() -> None:
    token = create_access_token(user_id=uuid4(), expires_delta=timedelta(seconds=-1))

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_rechaza_un_token_firmado_con_otra_clave() -> None:
    token = jwt.encode({"sub": str(uuid4())}, secrets.token_urlsafe(32), algorithm="HS256")

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)
