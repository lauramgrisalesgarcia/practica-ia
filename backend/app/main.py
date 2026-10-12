from fastapi import FastAPI

from app.transport.http.error_handlers import register_error_handlers
from app.transport.http.routers import auth, health, teachers


def create_app() -> FastAPI:
    app = FastAPI(title="Práctica IA — API", version="0.1.0")
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(teachers.router)
    return app


app = create_app()
