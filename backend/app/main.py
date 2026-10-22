from fastapi import FastAPI

from app.core.config import Settings, get_settings
from app.core.log_config import configure_logging
from app.transport.http.error_handlers import register_error_handlers
from app.transport.http.routers import auth, health, students, teachers


def create_app(settings: Settings | None = None) -> FastAPI:
    configure_logging()
    docs_enabled = (settings or get_settings()).api_docs_enabled
    # Sin documentación no se publica ni el esquema: no se expone la superficie de la API (OWASP A05)
    app = FastAPI(
        title="Práctica IA — API",
        version="0.1.0",
        docs_url="/docs" if docs_enabled else None,
        redoc_url="/redoc" if docs_enabled else None,
        openapi_url="/openapi.json" if docs_enabled else None,
    )
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(teachers.router)
    app.include_router(students.router)
    return app


app = create_app()
