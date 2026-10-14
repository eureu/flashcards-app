from tests.cards.helpers import create_group_with_publisher, create_personal, create_shared


def _shared_payload(group_id):
    return {
        "target": {"visibility": "group", "group_id": group_id},
        "front": "Purpose",
        "back": "цель",
    }


def test_member_cannot_create_shared(client, auth_headers):
    group, owner_headers, _, _ = create_group_with_publisher(client, auth_headers)

    response = client.post("/api/cards", headers=owner_headers, json=_shared_payload(group["id"]))

    assert response.status_code == 403
    assert client.get(
        f"/api/cards?group_id={group['id']}&filter=shared", headers=owner_headers
    ).json() == []


def test_other_owner_cannot_create_shared(client, auth_headers):
    owner_headers = auth_headers(2000000002)
    group = client.post("/api/groups", headers=owner_headers, json={"name": "Other"}).json()

    response = client.post("/api/cards", headers=owner_headers, json=_shared_payload(group["id"]))

    assert response.status_code == 403


def test_publisher_requires_membership(client, auth_headers):
    owner_headers = auth_headers(2000000001)
    group = client.post("/api/groups", headers=owner_headers, json={"name": "Friends"}).json()

    response = client.post(
        "/api/cards", headers=auth_headers(1568151709), json=_shared_payload(group["id"])
    )

    assert response.status_code == 403


def test_personal_card_is_private(client, auth_headers):
    author_headers = auth_headers(2000000002)
    card = create_personal(client, author_headers)
    foreign_headers = auth_headers(2000000001)

    response = client.patch(
        f"/api/cards/{card['id']}",
        headers=foreign_headers,
        json={"front": "Stolen", "back": "чужое", "expected_version": 1},
    )

    assert response.status_code == 404
    assert client.get("/api/cards", headers=foreign_headers).json() == []


def test_visibility_cannot_change_via_patch(client, auth_headers):
    headers = auth_headers(2000000002)
    card = create_personal(client, headers)

    response = client.patch(
        f"/api/cards/{card['id']}",
        headers=headers,
        json={
            "front": "Carry",
            "back": "нести",
            "expected_version": 1,
            "visibility": "group",
        },
    )

    assert response.status_code == 422


def test_author_edits_own_and_owner_edits_any(client, auth_headers):
    group, owner_headers, publisher_headers, _ = create_group_with_publisher(client, auth_headers)
    card = create_shared(client, publisher_headers, group["id"])

    author_edit = client.patch(
        f"/api/cards/{card['id']}",
        headers=publisher_headers,
        json={"front": "Purpose", "back": "цель/назначение", "expected_version": 1},
    )
    owner_edit = client.patch(
        f"/api/cards/{card['id']}",
        headers=owner_headers,
        json={"front": "Purpose", "back": "цель", "expected_version": 2},
    )

    assert author_edit.status_code == 200
    assert owner_edit.status_code == 200
    assert owner_edit.json()["version"] == 3


def test_only_owner_deletes_shared(client, auth_headers):
    group, owner_headers, publisher_headers, _ = create_group_with_publisher(client, auth_headers)
    card = create_shared(client, publisher_headers, group["id"])

    denied = client.request(
        "DELETE",
        f"/api/cards/{card['id']}",
        headers=publisher_headers,
        json={"expected_version": 1},
    )
    allowed = client.request(
        "DELETE",
        f"/api/cards/{card['id']}",
        headers=owner_headers,
        json={"expected_version": 1},
    )

    assert denied.status_code == 403
    assert allowed.status_code == 204


def test_other_member_cannot_edit_and_author_leaving_keeps_shared_card(client, auth_headers):
    group, owner_headers, publisher_headers, token = create_group_with_publisher(client, auth_headers)
    other_headers = auth_headers(2000000002)
    client.post(f"/api/invitations/{token}/join", headers=other_headers)
    card = create_shared(client, publisher_headers, group["id"])

    denied = client.patch(
        f"/api/cards/{card['id']}",
        headers=other_headers,
        json={"front": "Changed", "back": "изменено", "expected_version": 1},
    )
    left = client.delete(
        f"/api/groups/{group['id']}/membership", headers=publisher_headers
    )
    remaining = client.get(
        f"/api/cards?group_id={group['id']}&filter=shared", headers=owner_headers
    ).json()

    assert denied.status_code == 403
    assert left.status_code == 204
    assert [item["id"] for item in remaining] == [card["id"]]
