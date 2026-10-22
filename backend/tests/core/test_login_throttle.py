from datetime import UTC, datetime, timedelta

from app.core.login_throttle import BLOCK_WINDOW, MAX_FAILED_ATTEMPTS, InMemoryLoginThrottle
from app.domain.ports import Clock

KEY = "203.0.113.7|docente@colegio.edu"


class MovableClock(Clock):
    def __init__(self) -> None:
        self.current = datetime(2026, 10, 22, 12, 0, tzinfo=UTC)

    def now(self) -> datetime:
        return self.current


def build() -> tuple[InMemoryLoginThrottle, MovableClock]:
    clock = MovableClock()
    return InMemoryLoginThrottle(clock), clock


def fail(throttle: InMemoryLoginThrottle, times: int, key: str = KEY) -> None:
    for _ in range(times):
        throttle.register_failure(key)


def test_el_limite_es_de_5_intentos_fallidos_en_15_minutos() -> None:
    assert MAX_FAILED_ATTEMPTS == 5
    assert BLOCK_WINDOW == timedelta(minutes=15)


def test_no_bloquea_por_debajo_del_limite() -> None:
    throttle, _ = build()

    fail(throttle, MAX_FAILED_ATTEMPTS - 1)

    assert not throttle.is_blocked(KEY)


def test_bloquea_al_alcanzar_el_limite() -> None:
    throttle, _ = build()

    fail(throttle, MAX_FAILED_ATTEMPTS)

    assert throttle.is_blocked(KEY)


def test_el_bloqueo_solo_afecta_a_su_clave() -> None:
    throttle, _ = build()

    fail(throttle, MAX_FAILED_ATTEMPTS)

    assert not throttle.is_blocked("198.51.100.4|docente@colegio.edu")


def test_los_fallos_dejan_de_contar_al_pasar_la_ventana() -> None:
    throttle, clock = build()
    fail(throttle, MAX_FAILED_ATTEMPTS)

    clock.current += BLOCK_WINDOW + timedelta(seconds=1)

    assert not throttle.is_blocked(KEY)


def test_reiniciar_borra_los_fallos_de_la_clave() -> None:
    throttle, _ = build()
    fail(throttle, MAX_FAILED_ATTEMPTS)

    throttle.reset(KEY)

    assert not throttle.is_blocked(KEY)
