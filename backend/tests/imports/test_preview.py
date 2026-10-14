from tests.cards.helpers import create_group_with_publisher, create_personal


def test_preview_preserves_invalid_row_and_marks_duplicates(client, auth_headers):
    headers = auth_headers(1568151709)
    create_personal(client, headers, "Provision", "обеспечение")
    response = client.post(
        "/api/imports/preview",
        headers=headers,
        json={
            "target": {"visibility": "personal"},
            "text": 'Provision - обеспечение\nВыражение it depends означает "по обстоятельствам"',
        },
    )

    assert response.status_code == 200
    rows = response.json()["rows"]
    assert rows[0]["duplicate"] is True
    assert rows[0]["selected"] is False
    assert rows[1]["original"].startswith("Выражение it depends")
    assert rows[1]["error"] == "Не найден разделитель « - »"
    assert response.json()["confirmation_token"] is None


def test_preview_does_not_create_cards(client, auth_headers):
    headers = auth_headers(2000000002)
    response = client.post(
        "/api/imports/preview",
        headers=headers,
        json={"target": {"visibility": "personal"}, "text": "Purpose - цель"},
    )

    assert response.status_code == 200
    assert response.json()["selected_count"] == 1
    assert response.json()["confirmation_token"]
    assert client.get("/api/cards", headers=headers).json() == []


def test_nonpublisher_group_preview_is_forbidden(client, auth_headers):
    group, owner_headers, _, _ = create_group_with_publisher(client, auth_headers)

    response = client.post(
        "/api/imports/preview",
        headers=owner_headers,
        json={
            "target": {"visibility": "group", "group_id": group["id"]},
            "text": "Purpose - цель",
        },
    )

    assert response.status_code == 403
