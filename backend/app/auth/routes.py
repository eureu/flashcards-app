from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_actor
from app.auth.schemas import Actor, TelegramLoginRequest, TelegramLoginResponse
from app.auth.service import get_or_create_user, to_actor
from app.auth.telegram import validate_init_data
from app.clock import get_now
from app.db import get_session
from app.signing import SESSION_LIFETIME, create_session_token

router = APIRouter(prefix="/api")


@router.post("/auth/telegram", response_model=TelegramLoginResponse)
def telegram_login(
    payload: TelegramLoginRequest,
    request: Request,
    db: Session = Depends(get_session),
    now: datetime = Depends(get_now),
) -> TelegramLoginResponse:
    settings = request.app.state.settings
    identity = validate_init_data(payload.init_data, settings.bot_token, now)
    user = get_or_create_user(db, identity)
    actor = to_actor(user)
    return TelegramLoginResponse(
        access_token=create_session_token(user.id, settings.app_secret, now),
        expires_in=int(SESSION_LIFETIME.total_seconds()),
        user=actor,
        start_param=identity.start_param,
    )


@router.get("/me", response_model=Actor)
def get_me(actor: Actor = Depends(get_current_actor)) -> Actor:
    return actor


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
