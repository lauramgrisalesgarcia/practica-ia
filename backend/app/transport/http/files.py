"""Respuestas HTTP con archivos."""

import re
from urllib.parse import quote

from fastapi import Response

from app.domain.entities import LessonFile

# Comillas, barras invertidas, dos puntos y caracteres de control no pueden ir en la cabecera.
_UNSAFE = re.compile(r'["\:\x00-\x1f\x7f]')


def pdf_response(file: LessonFile) -> Response:
    return Response(
        content=file.content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": _content_disposition(file.filename),
            "X-Content-Type-Options": "nosniff",
        },
    )


def _content_disposition(filename: str) -> str:
    """`inline` con un nombre seguro: evita inyectar cabeceras y admite caracteres no ASCII (RFC 6266)."""
    safe = _UNSAFE.sub("", filename).strip() or "archivo.pdf"
    ascii_name = safe.encode("ascii", "replace").decode("ascii").replace("?", "_")
    header = f'inline; filename="{ascii_name}"'
    if ascii_name != safe:
        header += f"; filename*=UTF-8''{quote(safe)}"
    return header
