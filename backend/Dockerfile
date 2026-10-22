# Imagen del backend: en desarrollo, migraciones y datos de prueba (servicios "migrate" y "seed" de
# docker-compose.yml); en producción, también la API (servicio "api" de docker-compose.prod.yml).
# Los secretos NO se copian a la imagen: se inyectan como variables de entorno al ejecutarla.
FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.13.0 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Dependencias primero (capa cacheada mientras no cambie el lock), sin las de desarrollo.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --frozen --no-dev --no-install-project

COPY alembic.ini ./
COPY app ./app
COPY migrations ./migrations

# Sin privilegios de root.
RUN useradd --create-home --uid 1000 app && mkdir -p /app/storage && chown -R app:app /app/storage
USER app

CMD ["alembic", "upgrade", "head"]
