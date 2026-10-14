from datetime import timedelta

from app.learning.scheduler import schedule_review
from tests.conftest import FIXED_NOW


def test_again_returns_new_item_to_short_learning():
    result = schedule_review(None, 1, FIXED_NOW)

    assert result.due_at == FIXED_NOW + timedelta(minutes=1)
    assert result.is_short is True


def test_easy_graduates_new_item():
    result = schedule_review(None, 4, FIXED_NOW)

    assert result.due_at > FIXED_NOW + timedelta(minutes=10)
    assert result.is_short is False
