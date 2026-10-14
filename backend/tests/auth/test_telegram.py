from datetime import timedelta

from tests.conftest import FIXED_NOW


def test_valid_telegram_login(client, signed_init_data):
    response = client.post("/api/auth/telegram", json={"init_data": signed_init_data(1568151709)})

    assert response.status_code == 200
    assert response.json()["user"]["telegram_id"] == 1568151709
    assert response.json()["expires_in"] == 43200


def test_tampered_init_data_is_rejected(client, signed_init_data):
    raw = signed_init_data(1568151709).replace("Veniamin", "Attacker")

    assert client.post("/api/auth/telegram", json={"init_data": raw}).status_code == 401


def test_expired_init_data_is_rejected(client, signed_init_data):
    raw = signed_init_data(1568151709, FIXED_NOW - timedelta(hours=1, seconds=1))

    assert client.post("/api/auth/telegram", json={"init_data": raw}).status_code == 401


def test_future_init_data_is_rejected(client, signed_init_data):
    raw = signed_init_data(1568151709, FIXED_NOW + timedelta(seconds=61))

    assert client.post("/api/auth/telegram", json={"init_data": raw}).status_code == 401


def test_duplicate_security_field_is_rejected(client, signed_init_data):
    raw = signed_init_data(1568151709) + "&auth_date=0"

    assert client.post("/api/auth/telegram", json={"init_data": raw}).status_code == 401


def test_user_payload_cannot_be_replaced(client, signed_init_data):
    raw = signed_init_data(1568151709) + '&user={"id":2000000001,"first_name":"Attacker"}'

    assert client.post("/api/auth/telegram", json={"init_data": raw}).status_code == 401

