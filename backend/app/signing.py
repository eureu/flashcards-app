from __future__ import annotations

from datetime import datetime, timedelta
from uuid import UUID

import jwt

SESSION_ALGORITHM = "HS256"
SESSION_ISSUER = "language-cards"
SESSION_AUDIENCE = "language-cards-web"
SESSION_LIFETIME = timedelta(hours=12)


def create_session_token(user_id: UUID, secret: str, now: datetime) -> str:
    return jwt.encode(
        {
            "sub": str(user_id),
            "iss": SESSION_ISSUER,
            "aud": SESSION_AUDIENCE,
            "iat": now,
            "exp": now + SESSION_LIFETIME,
        },
        secret,
        algorithm=SESSION_ALGORITHM,
    )


def decode_session_token(token: str, secret: str, now: datetime) -> UUID:
    payload = jwt.decode(
        token,
        secret,
        algorithms=[SESSION_ALGORITHM],
        audience=SESSION_AUDIENCE,
        issuer=SESSION_ISSUER,
        options={
            "require": ["sub", "iss", "aud", "iat", "exp"],
            "verify_iat": False,
            "verify_exp": False,
        },
    )
    if now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    now_timestamp = now.timestamp()
    if float(payload["iat"]) > now_timestamp or float(payload["exp"]) <= now_timestamp:
        raise jwt.InvalidTokenError("session is not valid at the supplied time")
    return UUID(payload["sub"])
