from tests.cards.helpers import create_personal
from tests.learning.helpers import next_item, review


def test_directions_are_independent(client, auth_headers):
    headers = auth_headers(2000000002)
    create_personal(client, headers, "Purpose", "цель")
    first = next_item(client, headers)
    assert review(client, headers, first, 4).status_code == 200

    second = next_item(client, headers, last_card_id=first["card_id"])

    assert second["card_id"] == first["card_id"]
    assert second["direction"] != first["direction"]
    assert second["state_version"] == 0


def test_no_remaining_items_returns_204(client, auth_headers):
    headers = auth_headers(2000000002)
    card = create_personal(client, headers)
    first = next_item(client, headers)
    review(client, headers, first, 4)
    second = next_item(client, headers)
    review(client, headers, second, 4)

    response = client.get("/api/learning/next", headers=headers)

    assert response.status_code == 204


def test_summary_allows_early_learning_with_zero_due(client, auth_headers):
    headers = auth_headers(2000000002)
    create_personal(client, headers)
    first = next_item(client, headers)
    review(client, headers, first, 1)
    second = next_item(client, headers)
    review(client, headers, second, 1)

    summary = client.get("/api/learning/summary", headers=headers).json()

    assert summary["due_count"] == 0
    assert summary["new_count"] == 0
    assert summary["can_start"] is True


def test_opposite_direction_uses_available_alternative(client, auth_headers):
    headers = auth_headers(2000000002)
    first_card = create_personal(client, headers, "One", "один")
    create_personal(client, headers, "Two", "два")
    first = next_item(client, headers)

    second = next_item(client, headers, last_card_id=first_card["id"])

    assert second["card_id"] != first_card["id"]
