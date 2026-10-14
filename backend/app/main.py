from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.auth import models as auth_models  # noqa: F401
from app.auth.routes import router as auth_router
from app.cards import models as card_models  # noqa: F401
from app.cards.routes import router as cards_router
from app.config import Settings, load_settings
from app.db import Base, create_database
from app.errors import install_error_handlers
from app.groups import models as group_models  # noqa: F401
from app.groups.routes import router as groups_router
from app.imports.routes import router as imports_router
from app.learning import models as learning_models  # noqa: F401
from app.learning.routes import router as learning_router
from app.operations import models as operation_models  # noqa: F401


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
    app.include_router(groups_router)
    app.include_router(cards_router)
    app.include_router(imports_router)
    app.include_router(learning_router)

    @app.middleware("http")
    async def reject_oversized_body(request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 32 * 1024 * 1024:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=413,
                content={"error": {"code": "BODY_TOO_LARGE", "message": "Тело запроса слишком велико", "details": {}}},
            )
        return await call_next(request)
    install_error_handlers(app)
    return app


def create_default_app() -> FastAPI:
    return create_app(load_settings())
