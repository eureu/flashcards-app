from tests.cards.helpers import create_group_with_publisher, create_personal, create_shared


def test_group_dictionary_combines_shared_and_own_personal(client, auth_headers):
    group, _, publisher_headers, _ = create_group_with_publisher(client, auth_headers)
    create_shared(client, publisher_headers, group["id"], "Purpose", "цель")
    create_personal(client, publisher_headers, "Carry", "нести")

    all_cards = client.get(
        f"/api/cards?group_id={group['id']}&filter=all", headers=publisher_headers
    ).json()
    shared = client.get(
        f"/api/cards?group_id={group['id']}&filter=shared", headers=publisher_headers
    ).json()
    personal = client.get(
        f"/api/cards?group_id={group['id']}&filter=personal", headers=publisher_headers
    ).json()

    assert {card["front"] for card in all_cards} == {"Purpose", "Carry"}
    assert [card["front"] for card in shared] == ["Purpose"]
    assert [card["front"] for card in personal] == ["Carry"]


def test_search_treats_sql_wildcards_literally(client, auth_headers):
    headers = auth_headers(2000000002)
    create_personal(client, headers, "100%", "сто процентов")
    create_personal(client, headers, "Purpose", "цель")

    response = client.get("/api/cards?q=%25", headers=headers)

    assert [card["front"] for card in response.json()] == ["100%"]


def test_html_like_text_is_returned_unchanged(client, auth_headers):
    headers = auth_headers(2000000002)
    create_personal(client, headers, "<img src=x onerror=alert(1)>", "текст")

    response = client.get("/api/cards", headers=headers)

    assert response.json()[0]["front"] == "<img src=x onerror=alert(1)>"
