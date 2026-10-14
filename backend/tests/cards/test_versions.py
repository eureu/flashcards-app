from tests.cards.helpers import create_personal


def test_stale_update_returns_conflict_and_keeps_latest_text(client, auth_headers):
    headers = auth_headers(2000000002)
    card = create_personal(client, headers)
    first = client.patch(
        f"/api/cards/{card['id']}",
        headers=headers,
        json={"front": "Carry", "back": "нести/переносить", "expected_version": 1},
    )

    stale = client.patch(
        f"/api/cards/{card['id']}",
        headers=headers,
        json={"front": "Carry", "back": "ошибка", "expected_version": 1},
    )

    assert first.status_code == 200
    assert stale.status_code == 409
    assert stale.json()["error"]["code"] == "VERSION_CONFLICT"
    assert client.get("/api/cards", headers=headers).json()[0]["back"] == "нести/переносить"


def test_card_sides_are_trimmed_and_bounded(client, auth_headers):
    headers = auth_headers(2000000002)
    response = client.post(
        "/api/cards",
        headers=headers,
        json={
            "target": {"visibility": "personal"},
            "front": "  Purpose  ",
            "back": "  цель  ",
        },
    )
    too_long = client.post(
        "/api/cards",
        headers=headers,
        json={
            "target": {"visibility": "personal"},
            "front": "x" * 2001,
            "back": "цель",
        },
    )

    assert response.json()["front"] == "Purpose"
    assert response.json()["back"] == "цель"
    assert too_long.status_code == 422
