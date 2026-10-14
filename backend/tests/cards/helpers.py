def create_group_with_publisher(client, auth_headers):
    owner_headers = auth_headers(2000000001)
    group = client.post("/api/groups", headers=owner_headers, json={"name": "Friends"}).json()
    token = client.post(
        f"/api/groups/{group['id']}/invitation", headers=owner_headers
    ).json()["token"]
    publisher_headers = auth_headers(1568151709)
    client.post(f"/api/invitations/{token}/join", headers=publisher_headers)
    return group, owner_headers, publisher_headers, token


def create_shared(client, publisher_headers, group_id, front="Purpose", back="цель"):
    response = client.post(
        "/api/cards",
        headers=publisher_headers,
        json={
            "target": {"visibility": "group", "group_id": group_id},
            "front": front,
            "back": back,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def create_personal(client, headers, front="Carry", back="нести"):
    response = client.post(
        "/api/cards",
        headers=headers,
        json={
            "target": {"visibility": "personal"},
            "front": front,
            "back": back,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()
