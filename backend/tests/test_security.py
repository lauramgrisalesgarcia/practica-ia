from datetime import timedelta

import jwt
import pytest

from app.security import (
    InvalidTokenError,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_la_contraseña_no_se_guarda_en_texto_plano() -> None:
    password_hash = hash_password("Docente#2026")

    assert password_hash != "Docente#2026"
    assert password_hash.startswith("$argon2")


def test_verifica_la_contraseña_correcta() -> None:
    password_hash = hash_password("Docente#2026")

    assert verify_password("Docente#2026", password_hash) is True
    assert verify_password("otra", password_hash) is False


def test_el_token_identifica_al_usuario() -> None:
    token = create_access_token(user_id=7)

    assert decode_access_token(token) == 7


def test_rechaza_un_token_caducado() -> None:
    token = create_access_token(user_id=7, expires_delta=timedelta(seconds=-1))

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)


def test_rechaza_un_token_firmado_con_otra_clave() -> None:
    token = jwt.encode({"sub": "7"}, "otra-clave-cualquiera-de-32-bytes!", algorithm="HS256")

    with pytest.raises(InvalidTokenError):
        decode_access_token(token)
