"""Registros de la aplicación (OWASP A09): eventos de seguridad y fallos del LLM.

Salen por la salida de error, que Docker guarda (`docker compose logs api`). Nunca se registran
contraseñas, tokens ni la clave de Gemini.
"""

import logging

APP_LOGGER = "app"
LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"


def configure_logging() -> None:
    """Idempotente: crear la app varias veces (p. ej. en los tests) no duplica el manejador."""
    logger = logging.getLogger(APP_LOGGER)
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(LOG_FORMAT))
        logger.addHandler(handler)
