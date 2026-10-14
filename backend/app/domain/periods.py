"""Periodos de calendario en UTC, compartidos por los indicadores."""

from datetime import UTC, datetime


def month_start(moment: datetime, months_back: int = 0) -> datetime:
    """Primer instante (UTC) del mes que está `months_back` meses antes del de `moment`."""
    utc = moment.astimezone(UTC)
    index = utc.year * 12 + utc.month - 1 - months_back
    return datetime(index // 12, index % 12 + 1, 1, tzinfo=UTC)
