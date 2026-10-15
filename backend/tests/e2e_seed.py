"""Seed and verify restart persistence against the isolated E2E service."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
import time
from urllib.parse import urlencode
from uuid import UUID, uuid4

import httpx
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.auth.models import User
from app.learning.models import ReviewEvent, StudyState

BOT_TOKEN = "123456:test-bot-token"
TELEGRAM_ID = 1568151709
GROUP_NAME = "Проверка перезапуска"
FRONT = "Persisted after restart"
BACK = "Сохранено после перезапуска"


def signed_init_data() -> str:
    fields = {
        "auth_date": str(int(time.time())),
        "query_id": "restart-persistence",
        "user": json.dumps(
            {"id": TELEGRAM_ID, "first_name": "Проверка перезапуска"},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
    }
    check = "\n".join(f"{key}={fields[key]}" for key in sorted(fields))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(fields)


def actor(client: httpx.Client) -> dict[str, str]:
    response: httpx.Response | None = None
    for _ in range(20):
        try:
            response = client.post("/api/auth/telegram", json={"init_data": signed_init_data()})
            break
        except httpx.ConnectError:
            time.sleep(0.5)
    if response is None:
        raise RuntimeError("E2E API did not become ready within 10 seconds")
    response.raise_for_status()
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def seed(client: httpx.Client, headers: dict[str, str]) -> None:
    groups = client.get("/api/groups", headers=headers).json()
    group = next((item for item in groups if item["name"] == GROUP_NAME), None)
    if group is None:
        response = client.post("/api/groups", headers=headers, json={"name": GROUP_NAME})
        response.raise_for_status()
        group = response.json()
    cards = client.get(f"/api/cards?group_id={group['id']}", headers=headers).json()
    card = next((item for item in cards if item["front"] == FRONT), None)
    if card is None:
        response = client.post(
            "/api/cards",
            headers=headers,
            json={
                "target": {"visibility": "group", "group_id": group["id"]},
                "front": FRONT,
                "back": BACK,
            },
        )
        response.raise_for_status()
        card = response.json()
    response = client.post(
        "/api/learning/reviews",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={
            "card_id": card["id"],
            "direction": "en_ru",
            "rating": 1,
            "group_id": group["id"],
            "expected_content_version": card["version"],
            "expected_state_version": 0,
        },
    )
    if response.status_code not in (200, 409):
        response.raise_for_status()
    print(json.dumps({"seeded": True, "group_id": group["id"], "card_id": card["id"]}))


def verify(client: httpx.Client, headers: dict[str, str]) -> None:
    groups = client.get("/api/groups", headers=headers).json()
    group = next(item for item in groups if item["name"] == GROUP_NAME)
    cards = client.get(f"/api/cards?group_id={group['id']}", headers=headers).json()
    card = next(item for item in cards if item["front"] == FRONT and item["back"] == BACK)
    summary = client.get(f"/api/learning/summary?group_id={group['id']}", headers=headers)
    summary.raise_for_status()
    assert card["visibility"] == "group"
    assert summary.json()["can_start"] is True
    engine = create_engine(os.environ["DATABASE_URL"])
    with Session(engine) as db:
        user = db.scalar(select(User).where(User.telegram_id == TELEGRAM_ID))
        assert user is not None
        state = db.scalar(
            select(StudyState).where(
                StudyState.user_id == user.id,
                StudyState.card_id == UUID(card["id"]),
                StudyState.direction == "en_ru",
            )
        )
        assert state is not None
        assert state.version >= 1
        event_count = db.scalar(
            select(func.count()).select_from(ReviewEvent).where(
                ReviewEvent.user_id == user.id,
                ReviewEvent.card_id == UUID(card["id"]),
                ReviewEvent.direction == "en_ru",
            )
        )
        assert event_count is not None and event_count >= 1
        result = {
            "persisted": True,
            "group_id": group["id"],
            "card_id": card["id"],
            "state_version": state.version,
            "due_at": state.due_at.isoformat(),
            "event_count": event_count,
        }
    engine.dispose()
    print(json.dumps(result))


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in {"seed", "verify"}:
        raise SystemExit("usage: python tests/e2e_seed.py seed|verify")
    base_url = os.environ.get("E2E_BASE_URL", "http://api-e2e:8000")
    with httpx.Client(base_url=base_url, timeout=10) as client:
        headers = actor(client)
        (seed if sys.argv[1] == "seed" else verify)(client, headers)


if __name__ == "__main__":
    main()
