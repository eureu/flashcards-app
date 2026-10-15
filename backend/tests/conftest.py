from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from urllib.parse import urlencode

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

FIXED_NOW = datetime(2026, 10, 14, 12, 0, tzinfo=timezone.utc)
TEST_BOT_TOKEN = "123456:test-bot-token"


def _fallback_app() -> FastAPI:
    return FastAPI()


@pytest.fixture
def client():
    try:
        from app.config import Settings
        from app.main import create_app
    except ModuleNotFoundError:
        app = _fallback_app()
    else:
        from app.clock import get_now

        settings = Settings(
            app_env="test",
            app_secret="test-session-secret-with-at-least-32-characters",
            bot_token=TEST_BOT_TOKEN,
            database_url="sqlite+pysqlite:///:memory:",
        )
        app = create_app(settings)
        app.dependency_overrides[get_now] = lambda: FIXED_NOW

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def signed_init_data():
    def build(
        telegram_id: int,
        auth_date: datetime | None = None,
        start_param: str | None = None,
    ) -> str:
        issued_at = auth_date or FIXED_NOW
        fields = {
            "auth_date": str(int(issued_at.timestamp())),
            "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
            "user": json.dumps(
                {"id": telegram_id, "first_name": "Veniamin", "username": "veniamin"},
                separators=(",", ":"),
                ensure_ascii=False,
            ),
        }
        if start_param is not None:
            fields["start_param"] = start_param
        data_check_string = "\n".join(f"{key}={fields[key]}" for key in sorted(fields))
        secret_key = hmac.new(b"WebAppData", TEST_BOT_TOKEN.encode(), hashlib.sha256).digest()
        fields["hash"] = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        return urlencode(fields)

    return build


@pytest.fixture
def auth_headers(client, signed_init_data):
    def build(telegram_id: int) -> dict[str, str]:
        response = client.post("/api/auth/telegram", json={"init_data": signed_init_data(telegram_id)})
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return build

