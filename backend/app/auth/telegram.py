from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qsl

from app.auth.schemas import TelegramIdentity
from app.errors import DomainError

MAX_INIT_DATA_AGE = timedelta(hours=1)
MAX_CLOCK_SKEW = timedelta(seconds=60)


def _unauthorized() -> DomainError:
    return DomainError("INVALID_TELEGRAM_DATA", "Не удалось проверить данные Telegram", 401)


def validate_init_data(raw: str, bot_token: str, now: datetime) -> TelegramIdentity:
    try:
        pairs = parse_qsl(raw, keep_blank_values=True, strict_parsing=True)
    except ValueError as error:
        raise _unauthorized() from error

    keys = [key for key, _ in pairs]
    if not pairs or len(keys) != len(set(keys)):
        raise _unauthorized()

    values = dict(pairs)
    received_hash = values.pop("hash", None)
    if not received_hash or len(received_hash) != 64:
        raise _unauthorized()

    data_check_string = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(calculated_hash, received_hash):
        raise _unauthorized()

    try:
        auth_date = datetime.fromtimestamp(int(values["auth_date"]), tz=timezone.utc)
        user = json.loads(values["user"])
        telegram_id = int(user["id"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError, OverflowError) as error:
        raise _unauthorized() from error

    if now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    if auth_date < now - MAX_INIT_DATA_AGE or auth_date > now + MAX_CLOCK_SKEW:
        raise _unauthorized()

    name_parts = [str(user.get(key, "")).strip() for key in ("first_name", "last_name")]
    display_name = " ".join(part for part in name_parts if part)
    if not display_name:
        display_name = str(user.get("username", "")).strip()
    if not display_name or telegram_id <= 0:
        raise _unauthorized()

    return TelegramIdentity(
        telegram_id=telegram_id,
        display_name=display_name,
        auth_date=auth_date,
        start_param=values.get("start_param") or None,
    )
