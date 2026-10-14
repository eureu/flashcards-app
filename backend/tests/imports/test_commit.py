from uuid import uuid4


def _preview(client, headers, text="Purpose - цель"):
    response = client.post(
        "/api/imports/preview",
        headers=headers,
        json={"target": {"visibility": "personal"}, "text": text},
    )
    assert response.status_code == 200, response.text
    return response.json()


def _commit(client, headers, preview, key, rows=None):
    return client.post(
        "/api/imports/commit",
        headers={**headers, "Idempotency-Key": str(key)},
        json={
            "target": {"visibility": "personal"},
            "rows": rows or preview["rows"],
            "confirmation_token": preview["confirmation_token"],
        },
    )


def test_replay_after_success_keeps_same_created_ids(client, auth_headers):
    headers = auth_headers(2000000002)
    preview = _preview(client, headers)
    key = uuid4()

    first = _commit(client, headers, preview, key)
    second = _commit(client, headers, preview, key)

    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert first.json()["created_count"] == 1
    assert len(client.get("/api/cards", headers=headers).json()) == 1


def test_changed_rows_reject_confirmation(client, auth_headers):
    headers = auth_headers(2000000002)
    preview = _preview(client, headers)
    changed = [{**preview["rows"][0], "back": "назначение"}]

    response = _commit(client, headers, preview, uuid4(), changed)

    assert response.status_code == 409
    assert client.get("/api/cards", headers=headers).json() == []


def test_same_key_with_different_payload_conflicts(client, auth_headers):
    headers = auth_headers(2000000002)
    first_preview = _preview(client, headers, "Purpose - цель")
    key = uuid4()
    assert _commit(client, headers, first_preview, key).status_code == 200
    other_preview = _preview(client, headers, "Carry - нести")

    response = _commit(client, headers, other_preview, key)

    assert response.status_code == 409
