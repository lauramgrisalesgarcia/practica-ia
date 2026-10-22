import logging

from app.core.log_config import configure_logging


def test_los_registros_de_la_aplicacion_salen_desde_info_con_un_solo_manejador() -> None:
    configure_logging()
    configure_logging()

    app_logger = logging.getLogger("app")
    assert app_logger.level == logging.INFO
    assert len(app_logger.handlers) == 1
