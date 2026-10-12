from app.core.password_hasher import Argon2PasswordHasher


def test_la_contraseña_no_se_guarda_en_texto_plano() -> None:
    password_hash = Argon2PasswordHasher().hash("Docente#2026")

    assert password_hash != "Docente#2026"
    assert password_hash.startswith("$argon2")


def test_verifica_la_contraseña_correcta() -> None:
    hasher = Argon2PasswordHasher()
    password_hash = hasher.hash("Docente#2026")

    assert hasher.verify("Docente#2026", password_hash) is True
    assert hasher.verify("otra", password_hash) is False


def test_el_hash_de_relleno_es_un_hash_argon2_valido() -> None:
    hasher = Argon2PasswordHasher()

    assert hasher.dummy_hash.startswith("$argon2")
    assert hasher.verify("cualquiera", hasher.dummy_hash) is False
