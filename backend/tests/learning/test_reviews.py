from uuid import uuid4

from sqlalchemy import func, select

from app.learning.models import ReviewEvent
from tests.cards.helpers import create_group_with_publisher, create_personal, create_shared
from tests.learning.helpers import next_item, review


def test_users_are_independent(client, auth_headers):
    group, owner_headers, publisher_headers, _ = create_group_with_publisher(client, auth_headers)
    create_shared(client, publisher_headers, group["id"])
    item = next_item(client, publisher_headers, group["id"])
    review(client, publisher_headers, item, 4, group["id"])

    owner_summary = client.get(
        f"/api/learning/summary?group_id={group['id']}", headers=owner_headers
    ).json()

    assert owner_summary["new_count"] == 2


def test_response_loss_replay_has_one_event(client, auth_headers):
    headers = auth_headers(2000000002)
    create_personal(client, headers)
    item = next_item(client, headers)
    key = uuid4()

    first = review(client, headers, item, 3, key=key)
    second = review(client, headers, item, 3, key=key)
    with client.app.state.session_factory() as db:
        count = db.scalar(select(func.count()).select_from(ReviewEvent))

    assert first.status_code == second.status_code == 200
    assert first.json() == second.json()
    assert count == 1


def test_edited_card_rejects_stale_rating(client, auth_headers):
    headers = auth_headers(2000000002)
    card = create_personal(client, headers)
    item = next_item(client, headers)
    client.patch(
        f"/api/cards/{card['id']}",
        headers=headers,
        json={"front": "Carry", "back": "переносить", "expected_version": 1},
    )

    response = review(client, headers, item, 3)

    assert response.status_code == 409


def test_deleted_card_rejects_rating(client, auth_headers):
    headers = auth_headers(2000000002)
    card = create_personal(client, headers)
    item = next_item(client, headers)
    client.request(
        "DELETE",
        f"/api/cards/{card['id']}",
        headers=headers,
        json={"expected_version": 1},
    )

    assert review(client, headers, item, 3).status_code == 404


def test_left_group_rejects_rating(client, auth_headers):
    group, owner_headers, publisher_headers, _ = create_group_with_publisher(client, auth_headers)
    create_shared(client, publisher_headers, group["id"])
    item = next_item(client, publisher_headers, group["id"])
    client.delete(f"/api/groups/{group['id']}/membership", headers=publisher_headers)

    assert review(client, publisher_headers, item, 3, group["id"]).status_code == 403
