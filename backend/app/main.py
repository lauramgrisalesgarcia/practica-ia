from fastapi import FastAPI

from app.routers import auth


def create_app() -> FastAPI:
    app = FastAPI(title="Práctica IA — API", version="0.1.0")

    @app.get("/health", tags=["Sistema"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(auth.router)
    return app


app = create_app()
