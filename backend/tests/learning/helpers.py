from uuid import uuid4


def next_item(client, headers, group_id=None, last_card_id=None):
    params = []
    if group_id:
        params.append(f"group_id={group_id}")
    if last_card_id:
        params.append(f"last_card_id={last_card_id}")
    suffix = f"?{'&'.join(params)}" if params else ""
    response = client.get(f"/api/learning/next{suffix}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def review(client, headers, item, rating, group_id=None, key=None):
    return client.post(
        "/api/learning/reviews",
        headers={**headers, "Idempotency-Key": str(key or uuid4())},
        json={
            "card_id": item["card_id"],
            "direction": item["direction"],
            "rating": rating,
            "group_id": group_id,
            "expected_content_version": item["content_version"],
            "expected_state_version": item["state_version"],
        },
    )
