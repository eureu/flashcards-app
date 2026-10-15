import pytest

from app.groups.policy import can_publish_shared


@pytest.mark.parametrize(
    "telegram_id,is_member,expected",
    [
        (1568151709, True, True),
        (735056285, True, True),
        (1568151709, False, False),
        (735056285, False, False),
        (2000000001, True, False),
        (2000000002, True, False),
    ],
)
def test_shared_publishers_require_membership(telegram_id, is_member, expected):
    assert can_publish_shared(telegram_id, is_member) is expected


def test_missing_publisher_constant_denies(monkeypatch):
    monkeypatch.setattr("app.groups.policy.SHARED_CARD_PUBLISHER_TELEGRAM_IDS", None)

    assert can_publish_shared(1568151709, True) is False
    assert can_publish_shared(735056285, True) is False
