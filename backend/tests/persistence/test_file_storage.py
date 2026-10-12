from pathlib import Path

import pytest

from app.persistence.file_storage import LocalFileStorage


def test_lee_un_archivo_dentro_de_la_carpeta_raiz(tmp_path: Path) -> None:
    (tmp_path / "lessons" / "1").mkdir(parents=True)
    (tmp_path / "lessons" / "1" / "clase.pdf").write_bytes(b"%PDF-1.4 contenido")

    assert LocalFileStorage(tmp_path).read("lessons/1/clase.pdf") == b"%PDF-1.4 contenido"


def test_devuelve_none_si_el_archivo_no_existe(tmp_path: Path) -> None:
    assert LocalFileStorage(tmp_path).read("lessons/1/no-existe.pdf") is None


@pytest.mark.parametrize(
    "path",
    ["../secreto.txt", "lessons/../../secreto.txt", "/etc/passwd", "C:/Windows/win.ini"],
    ids=["padre", "padre anidado", "absoluta unix", "absoluta windows"],
)
def test_no_lee_fuera_de_la_carpeta_raiz(tmp_path: Path, path: str) -> None:
    root = tmp_path / "storage"
    root.mkdir()
    (tmp_path / "secreto.txt").write_text("no debe leerse")

    assert LocalFileStorage(root).read(path) is None


def test_no_lee_carpetas(tmp_path: Path) -> None:
    (tmp_path / "lessons").mkdir()

    assert LocalFileStorage(tmp_path).read("lessons") is None


def test_guarda_y_lee_un_archivo(tmp_path: Path) -> None:
    storage = LocalFileStorage(tmp_path)

    storage.write("lessons/2/nuevo.pdf", b"%PDF-1.4 nuevo")

    assert storage.read("lessons/2/nuevo.pdf") == b"%PDF-1.4 nuevo"


def test_no_escribe_fuera_de_la_carpeta_raiz(tmp_path: Path) -> None:
    root = tmp_path / "storage"
    root.mkdir()

    with pytest.raises(ValueError):
        LocalFileStorage(root).write("../fuera.pdf", b"x")

    assert not (tmp_path / "fuera.pdf").exists()
