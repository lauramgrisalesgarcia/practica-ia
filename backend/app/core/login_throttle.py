"""Límite de intentos fallidos de inicio de sesión, en memoria (OWASP A07: fuerza bruta).

Vale para una sola instancia de la API, como en este despliegue: con varias instancias o procesos,
cada una llevaría su propia cuenta y habría que guardarla en un almacén compartido.
"""

import threading
from collections import defaultdict
from datetime import datetime, timedelta

from app.domain.ports import Clock, LoginThrottle

MAX_FAILED_ATTEMPTS = 5
BLOCK_WINDOW = timedelta(minutes=15)


class InMemoryLoginThrottle(LoginThrottle):
    def __init__(self, clock: Clock) -> None:
        self._clock = clock
        self._failures: defaultdict[str, list[datetime]] = defaultdict(list)
        # FastAPI ejecuta los endpoints síncronos en varios hilos
        self._lock = threading.Lock()

    def is_blocked(self, key: str) -> bool:
        with self._lock:
            return len(self._recent_failures(key)) >= MAX_FAILED_ATTEMPTS

    def register_failure(self, key: str) -> None:
        with self._lock:
            self._failures[key] = [*self._recent_failures(key), self._clock.now()]

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def _recent_failures(self, key: str) -> list[datetime]:
        """Fallos dentro de la ventana; los antiguos se descartan para no acumular memoria."""
        since = self._clock.now() - BLOCK_WINDOW
        recent = [moment for moment in self._failures.get(key, []) if moment > since]
        if recent:
            self._failures[key] = recent
        else:
            self._failures.pop(key, None)
        return recent
