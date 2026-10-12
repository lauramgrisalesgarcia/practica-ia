from sqlalchemy import text
from sqlalchemy.orm import Session


def test_los_tests_usan_la_base_de_datos_de_test(db_session: Session) -> None:
    database = db_session.execute(text("SELECT current_database()")).scalar_one()

    assert database == "practica_ia_test"
