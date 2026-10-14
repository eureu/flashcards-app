from uuid import uuid4

from tests.cards.helpers import create_group_with_publisher


def test_second_stale_preview_detects_new_duplicate(client, auth_headers):
    headers = auth_headers(2000000002)
    payload = {"target": {"visibility": "personal"}, "text": "Purpose - цель"}
    first_preview = client.post("/api/imports/preview", headers=headers, json=payload).json()
    second_preview = client.post("/api/imports/preview", headers=headers, json=payload).json()

    first = client.post(
        "/api/imports/commit",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={
            "target": payload["target"],
            "rows": first_preview["rows"],
            "confirmation_token": first_preview["confirmation_token"],
        },
    )
    second = client.post(
        "/api/imports/commit",
        headers={**headers, "Idempotency-Key": str(uuid4())},
        json={
            "target": payload["target"],
            "rows": second_preview["rows"],
            "confirmation_token": second_preview["confirmation_token"],
        },
    )

    assert first.status_code == 200
    assert second.status_code == 409
    assert len(client.get("/api/cards", headers=headers).json()) == 1


def test_nonpublisher_bulk_import_is_forbidden(client, auth_headers):
    group, owner_headers, _, _ = create_group_with_publisher(client, auth_headers)
    response = client.post(
        "/api/imports/commit",
        headers={**owner_headers, "Idempotency-Key": str(uuid4())},
        json={
            "target": {"visibility": "group", "group_id": group["id"]},
            "rows": [],
            "confirmation_token": "forged",
        },
    )

    assert response.status_code == 403
