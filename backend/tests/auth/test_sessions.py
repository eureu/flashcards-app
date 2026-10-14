from datetime import timedelta
from uuid import UUID

from app.signing import create_session_token
from tests.conftest import FIXED_NOW


def test_me_requires_session(client):
    assert client.get("/api/me").status_code == 401


def test_me_returns_authenticated_actor(client, auth_headers):
    response = client.get("/api/me", headers=auth_headers(1568151709))

    assert response.status_code == 200
    assert response.json()["telegram_id"] == 1568151709
    assert response.json()["display_name"] == "Veniamin"


def test_invalid_bearer_token_is_rejected(client):
    response = client.get("/api/me", headers={"Authorization": "Bearer definitely-not-a-token"})

    assert response.status_code == 401


def test_expired_bearer_token_is_rejected(client, signed_init_data):
    login = client.post(
        "/api/auth/telegram", json={"init_data": signed_init_data(1568151709)}
    ).json()
    token = create_session_token(
        UUID(login["user"]["user_id"]),
        client.app.state.settings.app_secret,
        FIXED_NOW - timedelta(hours=12, seconds=1),
    )

    response = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 401


def test_health_is_public(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_unknown_api_route_is_not_frontend(client):
    response = client.get("/api/unknown")

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")

