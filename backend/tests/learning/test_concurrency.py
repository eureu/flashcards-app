from tests.cards.helpers import create_personal
from tests.learning.helpers import next_item, review


def test_two_devices_conflict(client, auth_headers):
    headers = auth_headers(2000000002)
    create_personal(client, headers)
    item = next_item(client, headers)

    first = review(client, headers, item, 3)
    second = review(client, headers, item, 3)

    assert first.status_code == 200
    assert second.status_code == 409
