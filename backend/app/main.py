from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth import models as auth_models  # noqa: F401
from app.auth.routes import router as auth_router
from app.config import Settings, load_settings
from app.db import Base, create_database
from app.errors import install_error_handlers


def create_app(settings: Settings) -> FastAPI:
    engine, session_factory = create_database(settings.database_url)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if settings.app_env == "test":
            Base.metadata.create_all(engine)
        yield
        engine.dispose()

    app = FastAPI(title="Language Cards", lifespan=lifespan)
    app.state.settings = settings
    app.state.session_factory = session_factory
    app.include_router(auth_router)
    install_error_handlers(app)
    return app


def create_default_app() -> FastAPI:
    return create_app(load_settings())
