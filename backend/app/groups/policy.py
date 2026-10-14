SHARED_CARD_PUBLISHER_TELEGRAM_ID: int = 1568151709


def can_publish_shared(telegram_id: int, is_member: bool) -> bool:
    publisher_id = SHARED_CARD_PUBLISHER_TELEGRAM_ID
    return publisher_id is not None and telegram_id == publisher_id and is_member
