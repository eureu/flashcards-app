SHARED_CARD_PUBLISHER_TELEGRAM_IDS: frozenset[int] | None = frozenset(
    {1568151709, 735056285}
)


def can_publish_shared(telegram_id: int, is_member: bool) -> bool:
    publisher_ids = SHARED_CARD_PUBLISHER_TELEGRAM_IDS
    return is_member and publisher_ids is not None and telegram_id in publisher_ids
