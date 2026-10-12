from pathlib import Path

from app.domain.ports import FileStorage


class LocalFileStorage(FileStorage):
    """Implementa `FileStorage` sobre el disco local, limitado a una carpeta raíz.

    Toda ruta se resuelve y debe quedar dentro de la raíz: se rechazan `..`, rutas absolutas
    y enlaces que apunten fuera (protección contra path traversal).
    """

    def __init__(self, root: Path) -> None:
        self._root = root

    def read(self, path: str) -> bytes | None:
        target = self._resolve(path)
        if target is None or not target.is_file():
            return None
        return target.read_bytes()

    def write(self, path: str, content: bytes) -> None:
        target = self._resolve(path)
        if target is None:
            raise ValueError("Ruta fuera del almacenamiento")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)

    def _resolve(self, path: str) -> Path | None:
        root = self._root.resolve()
        target = (root / path).resolve()
        return target if target.is_relative_to(root) and target != root else None
