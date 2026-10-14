def _group_and_token(client, auth_headers):
    owner_headers = auth_headers(2000000001)
    group = client.post("/api/groups", headers=owner_headers, json={"name": "Friends"}).json()
    token = client.post(
        f"/api/groups/{group['id']}/invitation", headers=owner_headers
    ).json()["token"]
    return owner_headers, group, token


def test_invitation_preview_exposes_only_group_name(client, auth_headers):
    _, _, token = _group_and_token(client, auth_headers)

    response = client.get(f"/api/invitations/{token}", headers=auth_headers(2000000002))

    assert response.status_code == 200
    assert response.json() == {"group_name": "Friends"}


def test_duplicate_join_keeps_one_membership(client, auth_headers):
    _, group, token = _group_and_token(client, auth_headers)
    member_headers = auth_headers(2000000002)

    first = client.post(f"/api/invitations/{token}/join", headers=member_headers)
    second = client.post(f"/api/invitations/{token}/join", headers=member_headers)

    assert first.status_code == second.status_code == 200
    assert len(second.json()["members"]) == 2
    assert client.get(f"/api/groups/{group['id']}", headers=member_headers).status_code == 200


def test_rotated_invitation_is_invalid(client, auth_headers):
    owner_headers, group, old_token = _group_and_token(client, auth_headers)
    new_token = client.post(
        f"/api/groups/{group['id']}/invitation", headers=owner_headers
    ).json()["token"]

    assert old_token != new_token
    assert client.get(
        f"/api/invitations/{old_token}", headers=auth_headers(2000000002)
    ).status_code == 404
    assert client.get(
        f"/api/invitations/{new_token}", headers=auth_headers(2000000002)
    ).status_code == 200


def test_only_owner_can_rotate_invitation(client, auth_headers):
    _, group, token = _group_and_token(client, auth_headers)
    member_headers = auth_headers(2000000002)
    client.post(f"/api/invitations/{token}/join", headers=member_headers)

    response = client.post(f"/api/groups/{group['id']}/invitation", headers=member_headers)

    assert response.status_code == 403
