def test_owner_is_member_and_group_name_is_trimmed(client, auth_headers):
    headers = auth_headers(2000000001)

    response = client.post("/api/groups", headers=headers, json={"name": "  Friends  "})

    assert response.status_code == 201
    assert response.json()["name"] == "Friends"
    assert response.json()["is_owner"] is True
    assert response.json()["can_add_shared"] is False
    assert len(response.json()["members"]) == 1


def test_group_owner_is_not_automatically_publisher(client, auth_headers):
    response = client.post(
        "/api/groups", headers=auth_headers(2000000001), json={"name": "Friends"}
    )

    assert response.json()["is_owner"] is True
    assert response.json()["can_add_shared"] is False


def test_publisher_can_add_only_while_member(client, auth_headers):
    owner_headers = auth_headers(2000000001)
    group = client.post("/api/groups", headers=owner_headers, json={"name": "Friends"}).json()
    invitation = client.post(
        f"/api/groups/{group['id']}/invitation", headers=owner_headers
    ).json()
    publisher_headers = auth_headers(1568151709)
    joined = client.post(
        f"/api/invitations/{invitation['token']}/join", headers=publisher_headers
    )
    assert joined.json()["can_add_shared"] is True

    assert client.delete(
        f"/api/groups/{group['id']}/membership", headers=publisher_headers
    ).status_code == 204
    assert client.get(f"/api/groups/{group['id']}", headers=publisher_headers).status_code == 403


def test_owner_cannot_leave(client, auth_headers):
    headers = auth_headers(2000000001)
    group = client.post("/api/groups", headers=headers, json={"name": "Friends"}).json()

    response = client.delete(f"/api/groups/{group['id']}/membership", headers=headers)

    assert response.status_code == 409


def test_non_member_cannot_read_group_details(client, auth_headers):
    owner_headers = auth_headers(2000000001)
    group = client.post("/api/groups", headers=owner_headers, json={"name": "Friends"}).json()

    response = client.get(f"/api/groups/{group['id']}", headers=auth_headers(2000000002))

    assert response.status_code == 403
