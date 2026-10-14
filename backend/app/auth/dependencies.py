from __future__ import annotations

from datetime import datetime

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.schemas import Actor
from app.auth.service import to_actor
from app.clock import get_now
from app.db import get_session
from app.errors import DomainError
from app.signing import decode_session_token

bearer = HTTPBearer(auto_error=False)


def get_current_actor(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_session),
    now: datetime = Depends(get_now),
) -> Actor:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise DomainError("UNAUTHORIZED", "Требуется вход", 401)
    try:
        user_id = decode_session_token(
            credentials.credentials, request.app.state.settings.app_secret, now
        )
    except (jwt.PyJWTError, ValueError):
        raise DomainError("UNAUTHORIZED", "Сессия недействительна или истекла", 401) from None

    user = db.get(User, user_id)
    if user is None:
        raise DomainError("UNAUTHORIZED", "Пользователь сессии не найден", 401)
    return to_actor(user)
